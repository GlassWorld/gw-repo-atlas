import { prisma } from "../db/prisma";
import { cloneAndScanRepository } from "./git.service";
import { generateProjectSummary } from "./openai.service";
import { resolveGitCredential } from "./git-credential.service";

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

  return prisma.analysis.create({
    data: {
      repositoryId: input.repositoryId,
      status: "PENDING"
    }
  });
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
      keyFiles: scan.keyFiles,
      recentCommits: scan.commits.map((commit) => ({
        title: commit.title,
        body: commit.body
      }))
    });

    await prisma.$transaction([
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
          recommendedReadOrder: aiSummary.recommendedReadOrder,
          keyFiles: aiSummary.keyFiles,
          fileTree: scan.fileTree
        }
      }),
      prisma.fileIndex.createMany({
        data: scan.files.map((file) => ({
          analysisId: input.analysisId,
          path: file.path,
          language: file.language,
          isEntryPoint: file.isEntryPoint,
          isKeyFile: aiSummary.keyFiles.includes(file.path) || file.isKeyFile,
          summary: file.isKeyFile ? "핵심 파일 후보" : null,
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
    recommendedReadOrder: (analysis.recommendedReadOrder as string[] | null) ?? [],
    keyFiles: (analysis.keyFiles as string[] | null) ?? [],
    fileTree: (analysis.fileTree as string[] | null) ?? [],
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
    }))
  };
}

export async function listAnalysesByUser(userId: string) {
  const analyses = await prisma.analysis.findMany({
    where: {
      repository: {
        userId
      }
    },
    include: {
      repository: true,
      files: true,
      commits: true
    },
    orderBy: { createdAt: "desc" }
  });

  return analyses.map((analysis) => ({
    id: analysis.id,
    status: analysis.status,
    projectTagline: analysis.projectTagline,
    projectSummary: analysis.projectSummary,
    errorMessage: analysis.errorMessage,
    createdAt: analysis.createdAt.toISOString(),
    completedAt: analysis.completedAt?.toISOString() ?? null,
    repository: {
      id: analysis.repository.id,
      name: analysis.repository.name,
      owner: analysis.repository.owner,
      url: analysis.repository.url,
      domain: analysis.repository.domain,
      isPrivate: analysis.repository.isPrivate
    },
    fileCount: analysis.files.length,
    commitCount: analysis.commits.length,
    keyFileCount: Array.isArray(analysis.keyFiles) ? analysis.keyFiles.length : 0
  }));
}

export async function getDashboardSummary(userId: string) {
  const [repositories, analyses, credentials] = await Promise.all([
    prisma.repository.findMany({
      where: { userId },
      include: {
        analyses: {
          orderBy: { createdAt: "desc" },
          take: 1
        }
      }
    }),
    prisma.analysis.findMany({
      where: {
        repository: {
          userId
        }
      },
      include: {
        repository: true,
        files: true,
        commits: true
      },
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    prisma.gitDomainCredential.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" }
    })
  ]);

  const statusCounts = analyses.reduce<Record<string, number>>((acc, analysis) => {
    acc[analysis.status] = (acc[analysis.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    metrics: {
      repositoryCount: repositories.length,
      privateRepositoryCount: repositories.filter((item) => item.isPrivate).length,
      analysisCount: analyses.length,
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
    recentAnalyses: analyses.map((analysis) => ({
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
