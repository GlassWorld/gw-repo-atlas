import { listAnalysesByUser } from "../services/analysis.service";
import { requireUser } from "../utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);

  return {
    analyses: await listAnalysesByUser(user.id)
  };
});
