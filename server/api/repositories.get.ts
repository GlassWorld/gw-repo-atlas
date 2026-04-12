import { listRepositoriesByUser } from "../services/repository.service";
import { requireUser } from "../utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const repositories = await listRepositoriesByUser(user.id);

  return {
    repositories: repositories.map((repository) => ({
      id: repository.id,
      url: repository.url,
      owner: repository.owner,
      name: repository.name,
      domain: repository.domain,
      isPrivate: repository.isPrivate,
      gitCredentialId: repository.gitCredentialId,
      gitCredential: repository.gitCredential
        ? {
            id: repository.gitCredential.id,
            domain: repository.gitCredential.domain,
            providerName: repository.gitCredential.providerName,
            hasToken: repository.gitCredential.hasToken
          }
        : null,
      updatedAt: repository.updatedAt,
      lastAnalysisStatus: repository.analyses[0]?.status ?? null,
      lastAnalysisId: repository.analyses[0]?.id ?? null
    }))
  };
});
