import { registerRepository } from "../services/repository.service";
import { requireUser } from "../utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = await readBody<{ url?: string; isPrivate?: boolean; gitCredentialId?: string | null }>(event);
  if (!body?.url) {
    throw createError({
      statusCode: 400,
      message: "url 필드는 필수입니다."
    });
  }

  const repository = await registerRepository({
    userId: user.id,
    url: body.url,
    isPrivate: body.isPrivate,
    gitCredentialId: body.gitCredentialId
  });
  return {
    repository: {
      id: repository.id,
      url: repository.url,
      name: repository.name,
      owner: repository.owner,
      domain: repository.domain,
      isPrivate: repository.isPrivate,
      gitCredentialId: repository.gitCredentialId
    }
  };
});
