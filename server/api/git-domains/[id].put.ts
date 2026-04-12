import { updateGitCredential } from "../../services/git-credential.service";
import { requireUser } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const credentialId = getRouterParam(event, "id");
  const body = await readBody<{
    repositoryUrl?: string;
    providerName?: string;
    isPrivate?: boolean;
    accessToken?: string;
    isDefault?: boolean;
    replaceAccessToken?: boolean;
    clearAccessToken?: boolean;
  }>(event);

  if (!credentialId) {
    throw createError({
      statusCode: 400,
      message: "git domain id가 필요합니다."
    });
  }

  if (!body?.repositoryUrl) {
    throw createError({
      statusCode: 400,
      message: "repositoryUrl은 필수입니다."
    });
  }

  const credential = await updateGitCredential({
    id: credentialId,
    userId: user.id,
    repositoryUrl: body.repositoryUrl,
    providerName: body.providerName ?? "",
    isPrivate: body.isPrivate,
    accessToken: body.accessToken,
    isDefault: body.isDefault,
    replaceAccessToken: body.replaceAccessToken,
    clearAccessToken: body.clearAccessToken
  });

  return {
    gitDomain: {
      id: credential.id,
      domain: credential.domain,
      providerName: credential.providerName,
      repositoryUrl: credential.repositoryUrl,
      repositoryOwner: credential.repositoryOwner,
      repositoryName: credential.repositoryName,
      isPrivate: credential.isPrivate,
      hasToken: credential.hasToken,
      isDefault: credential.isDefault
    }
  };
});
