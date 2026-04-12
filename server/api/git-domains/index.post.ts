import { upsertGitCredential } from "../../services/git-credential.service";
import { requireUser } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = await readBody<{
    repositoryUrl?: string;
    providerName?: string;
    isPrivate?: boolean;
    accessToken?: string;
    isDefault?: boolean;
  }>(event);

  if (!body?.repositoryUrl) {
    throw createError({
      statusCode: 400,
      message: "repositoryUrl은 필수입니다."
    });
  }

  const credential = await upsertGitCredential({
    userId: user.id,
    repositoryUrl: body.repositoryUrl,
    providerName: body.providerName ?? "",
    isPrivate: body.isPrivate,
    accessToken: body.accessToken,
    isDefault: body.isDefault
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
