import { testGitRepositoryAccess } from "../../services/git.service";
import { getGitCredentialById } from "../../services/git-credential.service";
import { requireUser } from "../../utils/auth";
import { parseRepositoryUrl } from "../../utils/repository";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = await readBody<{
    credentialId?: string;
    repositoryUrl?: string;
    accessToken?: string;
    isPrivate?: boolean;
  }>(event);

  if (!body?.repositoryUrl) {
    throw createError({
      statusCode: 400,
      message: "repositoryUrl은 필수입니다."
    });
  }

  const parsed = parseRepositoryUrl(body.repositoryUrl);
  const savedCredential = body.credentialId
    ? await getGitCredentialById({
      id: body.credentialId,
      userId: user.id
    })
    : null;

  const result = await testGitRepositoryAccess({
    repositoryUrl: parsed.normalizedUrl,
    domain: parsed.domain,
    isPrivate: typeof body.isPrivate === "boolean" ? body.isPrivate : Boolean(savedCredential?.isPrivate),
    accessToken: body.accessToken?.trim() || savedCredential?.accessToken || null
  });

  return {
    result: {
      ok: result.ok,
      headRef: result.headRef
    }
  };
});
