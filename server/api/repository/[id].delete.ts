import { deleteRepository } from "../../services/repository.service";
import { requireUser } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const repositoryId = getRouterParam(event, "id");

  if (!repositoryId) {
    throw createError({
      statusCode: 400,
      message: "repository id가 필요합니다."
    });
  }

  await deleteRepository({
    repositoryId,
    userId: user.id
  });

  return {
    success: true
  };
});
