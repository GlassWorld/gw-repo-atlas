import { getAnalysisDetail } from "../../services/analysis.service";
import { requireUser } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const analysisId = getRouterParam(event, "id");
  if (!analysisId) {
    throw createError({
      statusCode: 400,
      statusMessage: "analysis id가 필요합니다."
    });
  }

  return {
    analysis: await getAnalysisDetail({
      analysisId,
      userId: user.id
    })
  };
});
