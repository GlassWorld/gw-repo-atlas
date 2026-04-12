import { AnalysisStatus } from "@prisma/client";
import { prisma } from "../db/prisma";
import { parseRepositoryUrl } from "../utils/repository";

export async function listGitCredentials(userId: string) {
  return prisma.gitDomainCredential.findMany({
    where: { userId },
    include: {
      repository: {
        include: {
          analyses: {
            orderBy: { createdAt: "desc" },
            take: 1
          }
        }
      }
    },
    orderBy: [
      { isDefault: "desc" },
      { updatedAt: "desc" }
    ]
  });
}

export async function getGitCredentialById(input: {
  id: string;
  userId: string;
}) {
  const credential = await prisma.gitDomainCredential.findUnique({
    where: { id: input.id }
  });

  if (!credential || credential.userId !== input.userId) {
    throw createError({
      statusCode: 404,
      message: "조회할 Git 연결 정보를 찾을 수 없습니다."
    });
  }

  return credential;
}

function normalizeDomain(domain: string) {
  return domain.trim().toLowerCase();
}

function normalizeProviderName(providerName: string, domain: string) {
  return providerName.trim() || domain;
}

async function syncRepositoryForCredential(input: {
  credentialId: string;
  userId: string;
  repositoryUrl: string;
  isPrivate: boolean;
}) {
  const parsed = parseRepositoryUrl(input.repositoryUrl);
  const existingByCredential = await prisma.repository.findFirst({
    where: {
      userId: input.userId,
      gitCredentialId: input.credentialId
    }
  });

  if (existingByCredential) {
    return prisma.repository.update({
      where: { id: existingByCredential.id },
      data: {
        url: parsed.normalizedUrl,
        owner: parsed.owner,
        name: parsed.name,
        domain: parsed.domain,
        isPrivate: input.isPrivate,
        gitCredentialId: input.credentialId
      }
    });
  }

  return prisma.repository.upsert({
    where: {
      userId_url: {
        userId: input.userId,
        url: parsed.normalizedUrl
      }
    },
    update: {
      owner: parsed.owner,
      name: parsed.name,
      domain: parsed.domain,
      isPrivate: input.isPrivate,
      gitCredentialId: input.credentialId
    },
    create: {
      userId: input.userId,
      url: parsed.normalizedUrl,
      owner: parsed.owner,
      name: parsed.name,
      domain: parsed.domain,
      isPrivate: input.isPrivate,
      gitCredentialId: input.credentialId
    }
  });
}

export async function upsertGitCredential(input: {
  userId: string;
  repositoryUrl: string;
  providerName: string;
  isPrivate?: boolean;
  accessToken?: string;
  isDefault?: boolean;
}) {
  const parsed = parseRepositoryUrl(input.repositoryUrl);
  const normalizedDomain = normalizeDomain(parsed.domain);
  if (!input.repositoryUrl.trim()) {
    throw createError({
      statusCode: 400,
      message: "저장소 URL은 필수입니다."
    });
  }

  if (input.isDefault) {
    await prisma.gitDomainCredential.updateMany({
      where: { userId: input.userId },
      data: { isDefault: false }
    });
  }

  const credential = await prisma.gitDomainCredential.upsert({
    where: {
      userId_repositoryUrl: {
        userId: input.userId,
        repositoryUrl: parsed.normalizedUrl
      }
    },
    update: {
      domain: normalizedDomain,
      providerName: normalizeProviderName(input.providerName, normalizedDomain),
      repositoryUrl: parsed.normalizedUrl,
      repositoryOwner: parsed.owner,
      repositoryName: parsed.name,
      isPrivate: Boolean(input.isPrivate),
      accessToken: input.accessToken?.trim() || null,
      hasToken: Boolean(input.accessToken?.trim()),
      isDefault: Boolean(input.isDefault)
    },
    create: {
      userId: input.userId,
      domain: normalizedDomain,
      providerName: normalizeProviderName(input.providerName, normalizedDomain),
      repositoryUrl: parsed.normalizedUrl,
      repositoryOwner: parsed.owner,
      repositoryName: parsed.name,
      isPrivate: Boolean(input.isPrivate),
      accessToken: input.accessToken?.trim() || null,
      hasToken: Boolean(input.accessToken?.trim()),
      isDefault: Boolean(input.isDefault)
    }
  });

  await syncRepositoryForCredential({
    credentialId: credential.id,
    userId: input.userId,
    repositoryUrl: parsed.normalizedUrl,
    isPrivate: Boolean(input.isPrivate)
  });

  return credential;
}

export async function updateGitCredential(input: {
  id: string;
  userId: string;
  repositoryUrl: string;
  providerName: string;
  isPrivate?: boolean;
  accessToken?: string;
  isDefault?: boolean;
  replaceAccessToken?: boolean;
  clearAccessToken?: boolean;
}) {
  const credential = await prisma.gitDomainCredential.findUnique({
    where: { id: input.id }
  });

  if (!credential || credential.userId !== input.userId) {
    throw createError({
      statusCode: 404,
      message: "수정할 Git 도메인 정보를 찾을 수 없습니다."
    });
  }

  const parsed = parseRepositoryUrl(input.repositoryUrl);
  const normalizedDomain = normalizeDomain(parsed.domain);
  if (!input.repositoryUrl.trim()) {
    throw createError({
      statusCode: 400,
      message: "저장소 URL은 필수입니다."
    });
  }

  if (input.isDefault) {
    await prisma.gitDomainCredential.updateMany({
      where: {
        userId: input.userId,
        NOT: { id: input.id }
      },
      data: { isDefault: false }
    });
  }

  const updated = await prisma.gitDomainCredential.update({
    where: { id: input.id },
    data: {
      domain: normalizedDomain,
      providerName: normalizeProviderName(input.providerName, normalizedDomain),
      repositoryUrl: parsed.normalizedUrl,
      repositoryOwner: parsed.owner,
      repositoryName: parsed.name,
      isPrivate: Boolean(input.isPrivate),
      accessToken: input.clearAccessToken
        ? null
        : input.replaceAccessToken
          ? input.accessToken?.trim() || null
          : credential.accessToken,
      hasToken: input.clearAccessToken
        ? false
        : input.replaceAccessToken
          ? Boolean(input.accessToken?.trim())
          : credential.hasToken,
      isDefault: Boolean(input.isDefault)
    }
  });

  await syncRepositoryForCredential({
    credentialId: updated.id,
    userId: input.userId,
    repositoryUrl: parsed.normalizedUrl,
    isPrivate: Boolean(input.isPrivate)
  });

  return updated;
}

export async function deleteGitCredential(input: {
  id: string;
  userId: string;
}) {
  const credential = await prisma.gitDomainCredential.findUnique({
    where: { id: input.id },
    include: {
      repository: {
        include: {
          analyses: {
            where: {
              status: {
                in: [AnalysisStatus.PENDING, AnalysisStatus.RUNNING]
              }
            },
            select: { id: true }
          }
        }
      }
    }
  });

  if (!credential || credential.userId !== input.userId) {
    throw createError({
      statusCode: 404,
      message: "삭제할 Git 도메인 정보를 찾을 수 없습니다."
    });
  }

  if (credential.repository?.analyses.length) {
    throw createError({
      statusCode: 409,
      message: "진행 중인 분석이 있어 Git 정보를 삭제할 수 없습니다. 분석 완료 후 다시 시도해주세요."
    });
  }

  if (credential.repository) {
    await prisma.repository.delete({
      where: { id: credential.repository.id }
    });
  }

  await prisma.gitDomainCredential.delete({
    where: { id: input.id }
  });

  if (credential.isDefault) {
    const nextDefault = await prisma.gitDomainCredential.findFirst({
      where: { userId: input.userId },
      orderBy: [
        { updatedAt: "desc" },
        { createdAt: "desc" }
      ]
    });

    if (nextDefault) {
      await prisma.gitDomainCredential.update({
        where: { id: nextDefault.id },
        data: { isDefault: true }
      });
    }
  }

  return { id: credential.id };
}

export async function resolveGitCredential(userId: string, domain: string) {
  const normalizedDomain = normalizeDomain(domain);
  const exact = await prisma.gitDomainCredential.findUnique({
    where: {
      userId_domain: {
        userId,
        domain: normalizedDomain
      }
    }
  });

  if (exact) {
    return exact;
  }

  return prisma.gitDomainCredential.findFirst({
    where: {
      userId,
      isDefault: true
    }
  });
}
