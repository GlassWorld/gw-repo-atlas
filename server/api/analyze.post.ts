import { createAnalysis } from "../services/analysis.service";
import { enqueueBaseAnalysisJob } from "../services/analysis-job.service";
import { prisma } from "../db/prisma";
import { requireUser } from "../utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = await readBody<{ repositoryId?: string }>(event);
  if (!body?.repositoryId) {
    throw createError({
      statusCode: 400,
      message: "repositoryId 필드는 필수입니다."
    });
  }

  const { analysis, shouldRun } = await createAnalysis({
    repositoryId: body.repositoryId,
    userId: user.id
  });

  if (shouldRun) {
    try {
      await enqueueBaseAnalysisJob({
        analysisId: analysis.id,
        userId: user.id
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "분석 작업 등록에 실패했습니다.";

      await prisma.analysis.update({
        where: { id: analysis.id },
        data: {
          status: "FAILED",
          completedAt: new Date(),
          errorMessage: message
        }
      });

      throw createError({
        statusCode: 500,
        message
      });
    }
  }

  return {
    analysis: {
      id: analysis.id,
      status: analysis.status
    }
  };
});
