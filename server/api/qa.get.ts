import { listQaHistory } from "../services/qa.service";
import { requireUser } from "../utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);

  return {
    qas: await listQaHistory(user.id)
  };
});
