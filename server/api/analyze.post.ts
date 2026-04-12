import { createAnalysis, runAnalysis, validateAnalysisRequest } from "../services/analysis.service";
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

  await validateAnalysisRequest({
    repositoryId: body.repositoryId,
    userId: user.id
  });

  const analysis = await createAnalysis({
    repositoryId: body.repositoryId,
    userId: user.id
  });

  // Nitro 단일 프로세스 환경에서의 간단한 백그라운드 실행 방식입니다.
  void runAnalysis({
    analysisId: analysis.id,
    userId: user.id
  }).catch((error) => {
    console.error("[RepoAtlas] analysis failed", error);
  });

  return {
    analysis: {
      id: analysis.id,
      status: analysis.status
    }
  };
});
