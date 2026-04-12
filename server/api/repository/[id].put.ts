import { updateRepository } from "../../services/repository.service";
import { requireUser } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const repositoryId = getRouterParam(event, "id");
  const body = await readBody<{ url?: string; isPrivate?: boolean; gitCredentialId?: string | null }>(event);

  if (!repositoryId) {
    throw createError({
      statusCode: 400,
      message: "repository id가 필요합니다."
    });
  }

  if (!body?.url) {
    throw createError({
      statusCode: 400,
      message: "url 필드는 필수입니다."
    });
  }

  const repository = await updateRepository({
    repositoryId,
    userId: user.id,
    url: body.url,
    isPrivate: body.isPrivate,
    gitCredentialId: body.gitCredentialId
  });

  return {
    repository: {
      id: repository.id,
      url: repository.url,
      owner: repository.owner,
      name: repository.name,
      domain: repository.domain,
      isPrivate: repository.isPrivate,
      gitCredentialId: repository.gitCredentialId
    }
  };
});
