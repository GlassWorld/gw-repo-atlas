import { randomUUID } from "node:crypto";
import { prisma } from "../db/prisma";
import { runAnalysis, runAnalysisItemArtifact } from "./analysis.service";

export const ANALYSIS_JOB_TYPES = {
  baseAnalysis: "BASE_ANALYSIS",
  itemAnalysis: "ITEM_ANALYSIS"
} as const;

type AnalysisJobType = typeof ANALYSIS_JOB_TYPES[keyof typeof ANALYSIS_JOB_TYPES];

interface BaseAnalysisJobPayload {
  analysisId: string;
  userId: string;
}

interface ItemAnalysisJobPayload {
  artifactId: string;
  userId: string;
}

const workerId = `repo-atlas-${process.pid}-${randomUUID()}`;
const staleLockMs = 15 * 60 * 1000;

export async function enqueueBaseAnalysisJob(input: BaseAnalysisJobPayload) {
  return enqueueAnalysisJob({
    idempotencyKey: `base:${input.analysisId}`,
    type: ANALYSIS_JOB_TYPES.baseAnalysis,
    payload: input
  });
}

export async function enqueueAnalysisItemJob(input: ItemAnalysisJobPayload) {
  return enqueueAnalysisJob({
    idempotencyKey: `item:${input.artifactId}`,
    type: ANALYSIS_JOB_TYPES.itemAnalysis,
    payload: input
  });
}

export async function processNextAnalysisJob() {
  await recoverStaleAnalysisJobs();

  const job = await claimNextAnalysisJob();
  if (!job) {
    return false;
  }

  try {
    await runClaimedAnalysisJob(job.type as AnalysisJobType, job.payload);
    await prisma.analysisJob.update({
      where: { id: job.id },
      data: {
        status: "SUCCESS",
        completedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        lastError: null
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    const nextAttempts = job.attempts + 1;
    const shouldRetry = nextAttempts < job.maxAttempts;

    await prisma.analysisJob.update({
      where: { id: job.id },
      data: {
        status: shouldRetry ? "PENDING" : "FAILED",
        attempts: nextAttempts,
        availableAt: shouldRetry ? new Date(Date.now() + getRetryDelayMs(nextAttempts)) : job.availableAt,
        completedAt: shouldRetry ? null : new Date(),
        lockedAt: null,
        lockedBy: null,
        lastError: message
      }
    });

    console.error("[RepoAtlas] analysis job failed", {
      id: job.id,
      type: job.type,
      shouldRetry,
      error: message
    });
  }

  return true;
}

async function enqueueAnalysisJob(input: {
  idempotencyKey: string;
  type: AnalysisJobType;
  payload: BaseAnalysisJobPayload | ItemAnalysisJobPayload;
}) {
  return prisma.analysisJob.upsert({
    where: {
      idempotencyKey: input.idempotencyKey
    },
    create: {
      idempotencyKey: input.idempotencyKey,
      type: input.type,
      payload: input.payload,
      status: "PENDING",
      availableAt: new Date()
    },
    update: {
      type: input.type,
      payload: input.payload,
      status: "PENDING",
      attempts: 0,
      availableAt: new Date(),
      lockedAt: null,
      lockedBy: null,
      lastError: null,
      completedAt: null
    }
  });
}

async function claimNextAnalysisJob() {
  const now = new Date();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const job = await prisma.analysisJob.findFirst({
      where: {
        status: "PENDING",
        availableAt: {
          lte: now
        }
      },
      orderBy: [
        { availableAt: "asc" },
        { createdAt: "asc" }
      ]
    });

    if (!job) {
      return null;
    }

    const claimed = await prisma.analysisJob.updateMany({
      where: {
        id: job.id,
        status: "PENDING"
      },
      data: {
        status: "RUNNING",
        lockedAt: now,
        lockedBy: workerId
      }
    });

    if (claimed.count === 1) {
      return prisma.analysisJob.findUnique({
        where: { id: job.id }
      });
    }
  }

  return null;
}

async function recoverStaleAnalysisJobs() {
  const staleBefore = new Date(Date.now() - staleLockMs);

  await prisma.analysisJob.updateMany({
    where: {
      status: "RUNNING",
      lockedAt: {
        lt: staleBefore
      }
    },
    data: {
      status: "PENDING",
      lockedAt: null,
      lockedBy: null,
      availableAt: new Date()
    }
  });
}

async function runClaimedAnalysisJob(type: AnalysisJobType, payload: unknown) {
  switch (type) {
    case ANALYSIS_JOB_TYPES.baseAnalysis: {
      const value = parseBaseAnalysisJobPayload(payload);
      await runAnalysis(value);
      return;
    }
    case ANALYSIS_JOB_TYPES.itemAnalysis: {
      const value = parseItemAnalysisJobPayload(payload);
      await runAnalysisItemArtifact(value);
      return;
    }
  }
}

function parseBaseAnalysisJobPayload(payload: unknown): BaseAnalysisJobPayload {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "analysisId" in payload &&
    "userId" in payload &&
    typeof payload.analysisId === "string" &&
    typeof payload.userId === "string"
  ) {
    return {
      analysisId: payload.analysisId,
      userId: payload.userId
    };
  }

  throw new Error("기본 분석 작업 페이로드가 올바르지 않습니다.");
}

function parseItemAnalysisJobPayload(payload: unknown): ItemAnalysisJobPayload {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "artifactId" in payload &&
    "userId" in payload &&
    typeof payload.artifactId === "string" &&
    typeof payload.userId === "string"
  ) {
    return {
      artifactId: payload.artifactId,
      userId: payload.userId
    };
  }

  throw new Error("항목 분석 작업 페이로드가 올바르지 않습니다.");
}

function getRetryDelayMs(attempts: number) {
  return Math.min(60_000, 2 ** attempts * 2_000);
}
