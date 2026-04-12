import { prisma } from "../db/prisma";
import { parseRepositoryUrl } from "../utils/repository";
import { AnalysisStatus } from "@prisma/client";

export async function registerRepository(input: {
  userId: string;
  url: string;
  isPrivate?: boolean;
  gitCredentialId?: string | null;
}) {
  const parsed = parseRepositoryUrl(input.url);
  let gitCredentialId: string | null = input.gitCredentialId ?? null;

  if (gitCredentialId) {
    const credential = await prisma.gitDomainCredential.findUnique({
      where: { id: gitCredentialId }
    });

    if (!credential || credential.userId !== input.userId) {
      throw createError({
        statusCode: 404,
        message: "선택한 Git 정보를 찾을 수 없습니다."
      });
    }

    if (credential.domain !== parsed.domain) {
      throw createError({
        statusCode: 400,
        message: `선택한 Git 정보의 도메인(${credential.domain})과 저장소 URL 도메인(${parsed.domain})이 일치하지 않습니다.`
      });
    }
  }

  return prisma.repository.upsert({
    where: {
      userId_url: {
        userId: input.userId,
        url: parsed.normalizedUrl
      }
    },
    update: {
      isPrivate: Boolean(input.isPrivate),
      domain: parsed.domain,
      gitCredentialId
    },
    create: {
      userId: input.userId,
      url: parsed.normalizedUrl,
      owner: parsed.owner,
      name: parsed.name,
      domain: parsed.domain,
      isPrivate: Boolean(input.isPrivate),
      gitCredentialId
    }
  });
}

export async function getRepositoryOrThrow(input: {
  repositoryId: string;
  userId: string;
}) {
  const repository = await prisma.repository.findUnique({
    where: { id: input.repositoryId }
  });

  if (!repository || repository.userId !== input.userId) {
    throw createError({
      statusCode: 404,
      message: "저장소를 찾을 수 없습니다."
    });
  }

  return repository;
}

export async function listRepositoriesByUser(userId: string) {
  return prisma.repository.findMany({
    where: { userId },
    include: {
      gitCredential: true,
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: { updatedAt: "desc" }
  });
}

export async function updateRepository(input: {
  repositoryId: string;
  userId: string;
  url: string;
  isPrivate?: boolean;
  gitCredentialId?: string | null;
}) {
  const repository = await getRepositoryOrThrow({
    repositoryId: input.repositoryId,
    userId: input.userId
  });
  const parsed = parseRepositoryUrl(input.url);
  let gitCredentialId: string | null = input.gitCredentialId ?? null;

  if (gitCredentialId) {
    const credential = await prisma.gitDomainCredential.findUnique({
      where: { id: gitCredentialId }
    });

    if (!credential || credential.userId !== input.userId) {
      throw createError({
        statusCode: 404,
        message: "선택한 Git 정보를 찾을 수 없습니다."
      });
    }

    if (credential.domain !== parsed.domain) {
      throw createError({
        statusCode: 400,
        message: `선택한 Git 정보의 도메인(${credential.domain})과 저장소 URL 도메인(${parsed.domain})이 일치하지 않습니다.`
      });
    }
  }

  return prisma.repository.update({
    where: { id: repository.id },
    data: {
      url: parsed.normalizedUrl,
      owner: parsed.owner,
      name: parsed.name,
      domain: parsed.domain,
      isPrivate: Boolean(input.isPrivate),
      gitCredentialId
    }
  });
}

export async function deleteRepository(input: {
  repositoryId: string;
  userId: string;
}) {
  const repository = await getRepositoryOrThrow(input);
  const activeAnalysis = await prisma.analysis.findFirst({
    where: {
      repositoryId: repository.id,
      status: {
        in: [AnalysisStatus.PENDING, AnalysisStatus.RUNNING]
      }
    },
    select: { id: true }
  });

  if (activeAnalysis) {
    throw createError({
      statusCode: 409,
      message: "진행 중인 분석이 있어 저장소를 삭제할 수 없습니다. 분석 완료 후 다시 시도해주세요."
    });
  }

  await prisma.repository.delete({
    where: { id: repository.id }
  });

  return { id: repository.id };
}
