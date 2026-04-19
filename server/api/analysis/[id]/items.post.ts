import { enqueueAnalysisItemJob } from "../../../services/analysis-job.service";
import { requestAnalysisItem } from "../../../services/analysis.service";
import { requireUser } from "../../../utils/auth";
import type { AnalysisItemType } from "../../../../types/atlas";
import { isAnalysisItemType } from "../../../../utils/analysis-items";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const analysisId = getRouterParam(event, "id");
  const body = await readBody<{ type?: AnalysisItemType }>(event);

  if (!analysisId) {
    throw createError({
      statusCode: 400,
      statusMessage: "analysis id가 필요합니다."
    });
  }

  if (!body?.type || !isAnalysisItemType(body.type)) {
    throw createError({
      statusCode: 400,
      statusMessage: "분석 항목 type이 올바르지 않습니다."
    });
  }

  const { artifact, shouldRun } = await requestAnalysisItem({
    analysisId,
    userId: user.id,
    type: body.type
  });

  if (shouldRun) {
    await enqueueAnalysisItemJob({
      artifactId: artifact.id,
      userId: user.id
    });
  }

  return {
    item: {
      ...artifact,
      detailPath: `/analysis/${analysisId}/items/${body.type}`
    },
    shouldRun
  };
});
