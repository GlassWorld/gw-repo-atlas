import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { cloneAndScanRepository } from "./git.service";
import { generateAnalysisItemReport, generateProjectSummary } from "./openai.service";
import { resolveGitCredential } from "./git-credential.service";
import type { AnalysisArtifactRecord, AnalysisItemResult, AnalysisItemType, HealthScore } from "../../types/atlas";
import { getAnalysisItemDefinition, isAnalysisItemType } from "../../utils/analysis-items";

export async function validateAnalysisRequest(input: {
  repositoryId: string;
  userId: string;
}) {
  const repository = await prisma.repository.findUnique({
    where: { id: input.repositoryId },
    include: { gitCredential: true }
  });

  if (!repository || repository.userId !== input.userId) {
    throw createError({
      statusCode: 404,
      message: "저장소를 찾을 수 없습니다."
    });
  }

  const credential = repository.gitCredential ?? await resolveGitCredential(input.userId, repository.domain);

  if (repository.isPrivate && !credential?.accessToken) {
    throw createError({
      statusCode: 400,
      message: repository.gitCredentialId
        ? "선택한 Git 정보에 액세스 토큰이 없어 프라이빗 저장소를 분석할 수 없습니다. Git 등록 메뉴에서 토큰을 먼저 수정해주세요."
        : `${repository.domain} 도메인에 대한 액세스 토큰이 없어 프라이빗 저장소를 분석할 수 없습니다. Git 등록 메뉴에서 토큰을 먼저 등록해주세요.`
    });
  }

  return {
    repository,
    credential
  };
}

export async function createAnalysis(input: {
  repositoryId: string;
  userId: string;
}) {
  await validateAnalysisRequest(input);

  const existing = await prisma.analysis.findFirst({
    where: { repositoryId: input.repositoryId },
    orderBy: { createdAt: "desc" }
  });

  if (existing?.status === "PENDING" || existing?.status === "RUNNING") {
    return {
      analysis: existing,
      shouldRun: false
    };
  }

  if (existing) {
    const analysis = await prisma.analysis.update({
      where: { id: existing.id },
      data: {
        status: "PENDING",
        startedAt: null,
        completedAt: null,
        errorMessage: null
      }
    });

    return {
      analysis,
      shouldRun: true
    };
  }

  const analysis = await prisma.analysis.create({
    data: {
      repositoryId: input.repositoryId,
      status: "PENDING"
    }
  });

  return {
    analysis,
    shouldRun: true
  };
}

export async function runAnalysis(input: {
  analysisId: string;
  userId: string;
}) {
  const analysis = await prisma.analysis.findUnique({
    where: { id: input.analysisId },
    include: {
      repository: {
        include: {
          gitCredential: true
        }
      }
    }
  });

  if (!analysis || analysis.repository.userId !== input.userId) {
    throw createError({
      statusCode: 404,
      message: "분석 대상을 찾을 수 없습니다."
    });
  }

  await prisma.analysis.update({
    where: { id: input.analysisId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      errorMessage: null
    }
  });

  let cleanup: (() => Promise<void>) | null = null;

  try {
    const credential = analysis.repository.gitCredential ?? await resolveGitCredential(input.userId, analysis.repository.domain);
    const scan = await cloneAndScanRepository({
      repositoryUrl: analysis.repository.url,
      domain: credential?.domain ?? analysis.repository.domain,
      isPrivate: analysis.repository.isPrivate,
      accessToken: credential?.accessToken ?? null
    });
    cleanup = scan.cleanup;

    const aiSummary = await generateProjectSummary({
      repositoryUrl: analysis.repository.url,
      fileTree: scan.fileTree,
      analysisSnippets: scan.analysisSnippets,
      recentCommits: scan.commits.map((commit) => ({
        title: commit.title,
        body: commit.body
      }))
    });

    await prisma.$transaction([
      prisma.analysisArtifact.deleteMany({
        where: { analysisId: input.analysisId }
      }),
      prisma.fileIndex.deleteMany({
        where: { analysisId: input.analysisId }
      }),
      prisma.commitSummary.deleteMany({
        where: { analysisId: input.analysisId }
      }),
      prisma.analysis.update({
        where: { id: input.analysisId },
        data: {
          status: "SUCCESS",
          completedAt: new Date(),
          projectTagline: aiSummary.tagline,
          projectSummary: aiSummary.summary,
          inferredStack: aiSummary.inferredStack,
          entryPoints: aiSummary.entryPoints,
          fileTree: scan.fileTree,
          healthScore: aiSummary.healthScore
        }
      }),
      prisma.fileIndex.createMany({
        data: scan.files.map((file) => ({
          analysisId: input.analysisId,
          path: file.path,
          language: file.language,
          isEntryPoint: file.isEntryPoint,
          isKeyFile: file.isKeyFile,
          summary: file.summary,
          snippet: file.snippet
        }))
      }),
      prisma.commitSummary.createMany({
        data: scan.commits.map((commit) => ({
          analysisId: input.analysisId,
          commitHash: commit.commitHash,
          authorName: commit.authorName,
          authorEmail: commit.authorEmail,
          committedAt: commit.committedAt,
          title: commit.title,
          body: commit.body,
          changeSummary: commit.body || commit.title
        }))
      })
    ]);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "알 수 없는 오류";

    await prisma.analysis.update({
      where: { id: input.analysisId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: message
      }
    });

    throw error;
  } finally {
    if (cleanup) {
      await cleanup();
    }
  }
}

export async function getAnalysisDetail(input: {
  analysisId: string;
  userId: string;
}) {
  const analysis = await prisma.analysis.findUnique({
    where: { id: input.analysisId },
    include: {
      repository: true,
      files: {
        orderBy: { path: "asc" }
      },
      commits: {
        orderBy: { committedAt: "desc" }
      },
      artifacts: {
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!analysis || analysis.repository.userId !== input.userId) {
    throw createError({
      statusCode: 404,
      message: "분석 결과를 찾을 수 없습니다."
    });
  }

  return {
    id: analysis.id,
    status: analysis.status,
    projectSummary: analysis.projectSummary,
    projectTagline: analysis.projectTagline,
    inferredStack: (analysis.inferredStack as string[] | null) ?? [],
    entryPoints: (analysis.entryPoints as string[] | null) ?? [],
    fileTree: (analysis.fileTree as string[] | null) ?? [],
    healthScore: analysis.healthScore,
    errorMessage: analysis.errorMessage,
    repository: {
      id: analysis.repository.id,
      url: analysis.repository.url,
      name: analysis.repository.name,
      owner: analysis.repository.owner
    },
    files: analysis.files.map((file) => ({
      id: file.id,
      path: file.path,
      language: file.language,
      isEntryPoint: file.isEntryPoint,
      isKeyFile: file.isKeyFile,
      summary: file.summary,
      snippet: file.snippet
    })),
    commits: analysis.commits.map((commit) => ({
      id: commit.id,
      commitHash: commit.commitHash,
      authorName: commit.authorName,
      committedAt: commit.committedAt.toISOString(),
      title: commit.title,
      changeSummary: commit.changeSummary
    })),
    artifacts: analysis.artifacts
      .filter((artifact) => isAnalysisItemType(artifact.type))
      .map(serializeAnalysisArtifact)
  };
}

export async function requestAnalysisItem(input: {
  analysisId: string;
  userId: string;
  type: AnalysisItemType;
}) {
  const definition = getAnalysisItemDefinition(input.type);
  if (!definition) {
    throw createError({
      statusCode: 400,
      message: "지원하지 않는 분석 항목입니다."
    });
  }

  const analysis = await prisma.analysis.findUnique({
    where: { id: input.analysisId },
    include: {
      repository: true
    }
  });

  if (!analysis || analysis.repository.userId !== input.userId) {
    throw createError({
      statusCode: 404,
      message: "분석 결과를 찾을 수 없습니다."
    });
  }

  if (analysis.status !== "SUCCESS") {
    throw createError({
      statusCode: 400,
      message: "기본 분석이 완료된 뒤 항목 분석을 실행할 수 있습니다."
    });
  }

  const existing = await prisma.analysisArtifact.findUnique({
    where: {
      analysisId_type: {
        analysisId: input.analysisId,
        type: input.type
      }
    }
  });

  if (existing?.status === "PENDING" || existing?.status === "RUNNING") {
    return {
      artifact: serializeAnalysisArtifact(existing),
      shouldRun: false
    };
  }

  const artifact = await prisma.analysisArtifact.upsert({
    where: {
      analysisId_type: {
        analysisId: input.analysisId,
        type: input.type
      }
    },
    create: {
      analysisId: input.analysisId,
      type: input.type,
      title: definition.title,
      status: "PENDING"
    },
    update: {
      title: definition.title,
      status: "PENDING",
      summary: null,
      result: Prisma.DbNull,
      errorMessage: null,
      startedAt: null,
      completedAt: null
    }
  });

  return {
    artifact: serializeAnalysisArtifact(artifact),
    shouldRun: true
  };
}

export async function runAnalysisItemArtifact(input: {
  artifactId: string;
  userId: string;
}) {
  const artifact = await prisma.analysisArtifact.findUnique({
    where: { id: input.artifactId },
    include: {
      analysis: {
        include: {
          repository: true,
          files: {
            orderBy: { path: "asc" }
          },
          commits: {
            orderBy: { committedAt: "desc" }
          }
        }
      }
    }
  });

  if (!artifact || artifact.analysis.repository.userId !== input.userId || !isAnalysisItemType(artifact.type)) {
    throw createError({
      statusCode: 404,
      message: "항목 분석 대상을 찾을 수 없습니다."
    });
  }

  await prisma.analysisArtifact.update({
    where: { id: input.artifactId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
      errorMessage: null
    }
  });

  try {
    const result = await generateAnalysisItemReport({
      type: artifact.type,
      repositoryUrl: artifact.analysis.repository.url,
      projectSummary: artifact.analysis.projectSummary,
      inferredStack: (artifact.analysis.inferredStack as string[] | null) ?? [],
      entryPoints: (artifact.analysis.entryPoints as string[] | null) ?? [],
      fileTree: (artifact.analysis.fileTree as string[] | null) ?? [],
      healthScore: artifact.analysis.healthScore as HealthScore | null,
      files: artifact.analysis.files.map((file) => ({
        path: file.path,
        language: file.language,
        isEntryPoint: file.isEntryPoint,
        isKeyFile: file.isKeyFile,
        summary: file.summary,
        snippet: file.snippet
      })),
      commits: artifact.analysis.commits.map((commit) => ({
        title: commit.title,
        authorName: commit.authorName,
        committedAt: commit.committedAt.toISOString(),
        changeSummary: commit.changeSummary
      }))
    });

    await prisma.analysisArtifact.update({
      where: { id: input.artifactId },
      data: {
        status: "SUCCESS",
        summary: result.summary,
        result,
        completedAt: new Date(),
        errorMessage: null
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";

    await prisma.analysisArtifact.update({
      where: { id: input.artifactId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage: message
      }
    });

    throw error;
  }
}

function serializeAnalysisArtifact(artifact: {
  id: string;
  type: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  title: string;
  summary: string | null;
  result: unknown;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AnalysisArtifactRecord {
  return {
    id: artifact.id,
    type: artifact.type as AnalysisItemType,
    status: artifact.status,
    title: artifact.title,
    summary: artifact.summary,
    result: artifact.result as AnalysisItemResult | null,
    errorMessage: artifact.errorMessage,
    startedAt: artifact.startedAt?.toISOString() ?? null,
    completedAt: artifact.completedAt?.toISOString() ?? null,
    createdAt: artifact.createdAt.toISOString(),
    updatedAt: artifact.updatedAt.toISOString()
  };
}

export async function listAnalysesByUser(userId: string) {
  const repositories = await prisma.repository.findMany({
    where: { userId },
    include: {
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          files: true,
          commits: true
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  return repositories.flatMap((repository) => {
    const analysis = repository.analyses[0];
    if (!analysis) {
      return [];
    }

    return {
      id: analysis.id,
      status: analysis.status,
      projectTagline: analysis.projectTagline,
      projectSummary: analysis.projectSummary,
      errorMessage: analysis.errorMessage,
      createdAt: analysis.createdAt.toISOString(),
      startedAt: analysis.startedAt?.toISOString() ?? null,
      completedAt: analysis.completedAt?.toISOString() ?? null,
      repository: {
        id: repository.id,
        name: repository.name,
        owner: repository.owner,
        url: repository.url,
        domain: repository.domain,
        isPrivate: repository.isPrivate
      },
      fileCount: analysis.files.length,
      commitCount: analysis.commits.length
    };
  });
}

export async function getDashboardSummary(userId: string) {
  const [repositories, credentials] = await Promise.all([
    prisma.repository.findMany({
      where: { userId },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            files: true,
            commits: true
          }
        }
      }
    }),
    prisma.gitDomainCredential.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" }
    })
  ]);

  const latestAnalyses = repositories
    .flatMap((repository) => repository.analyses.map((analysis) => ({ ...analysis, repository })))
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  const statusCounts = latestAnalyses.reduce<Record<string, number>>((acc, analysis) => {
    acc[analysis.status] = (acc[analysis.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    metrics: {
      repositoryCount: repositories.length,
      privateRepositoryCount: repositories.filter((item) => item.isPrivate).length,
      analysisCount: latestAnalyses.length,
      successCount: statusCounts.SUCCESS ?? 0,
      runningCount: statusCounts.RUNNING ?? 0,
      failedCount: statusCounts.FAILED ?? 0,
      gitDomainCount: credentials.length
    },
    repositories: repositories.slice(0, 6).map((repository) => ({
      id: repository.id,
      name: repository.name,
      owner: repository.owner,
      domain: repository.domain,
      isPrivate: repository.isPrivate,
      lastAnalysisStatus: repository.analyses[0]?.status ?? null,
      lastAnalysisId: repository.analyses[0]?.id ?? null
    })),
    recentAnalyses: latestAnalyses.slice(0, 8).map((analysis) => ({
      id: analysis.id,
      status: analysis.status,
      projectTagline: analysis.projectTagline,
      createdAt: analysis.createdAt.toISOString(),
      repositoryName: `${analysis.repository.owner}/${analysis.repository.name}`,
      fileCount: analysis.files.length,
      commitCount: analysis.commits.length
    })),
    gitDomains: credentials.map((credential) => ({
      id: credential.id,
      domain: credential.domain,
      hasToken: credential.hasToken,
      isDefault: credential.isDefault
    }))
  };
}
