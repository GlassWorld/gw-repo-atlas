import { getDashboardSummary } from "../services/analysis.service";
import { requireUser } from "../utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);

  return {
    dashboard: await getDashboardSummary(user.id)
  };
});
