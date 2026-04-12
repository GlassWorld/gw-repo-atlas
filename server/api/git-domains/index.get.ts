import { listGitCredentials } from "../../services/git-credential.service";
import { requireUser } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const credentials = await listGitCredentials(user.id);

  return {
    gitDomains: credentials.map((credential) => ({
      id: credential.id,
      domain: credential.domain,
      providerName: credential.providerName,
      repositoryUrl: credential.repositoryUrl,
      repositoryOwner: credential.repositoryOwner,
      repositoryName: credential.repositoryName,
      isPrivate: credential.isPrivate,
      hasToken: credential.hasToken,
      isDefault: credential.isDefault,
      repositoryId: credential.repository?.id ?? null,
      lastAnalysisStatus: credential.repository?.analyses[0]?.status ?? null,
      lastAnalysisId: credential.repository?.analyses[0]?.id ?? null,
      createdAt: credential.createdAt,
      updatedAt: credential.updatedAt
    }))
  };
});
