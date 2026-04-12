import { answerQuestion } from "../services/qa.service";
import { requireUser } from "../utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = await readBody<{
    repositoryId?: string;
    analysisId?: string;
    question?: string;
  }>(event);

  if (!body?.repositoryId || !body.analysisId || !body.question) {
    throw createError({
      statusCode: 400,
      message: "repositoryId, analysisId, question 필드는 모두 필수입니다."
    });
  }

  return {
    qa: await answerQuestion({
      userId: user.id,
      repositoryId: body.repositoryId,
      analysisId: body.analysisId,
      question: body.question
    })
  };
});
