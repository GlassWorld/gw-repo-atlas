import { deleteGitCredential } from "../../services/git-credential.service";
import { requireUser } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const credentialId = getRouterParam(event, "id");

  if (!credentialId) {
    throw createError({
      statusCode: 400,
      message: "git domain id가 필요합니다."
    });
  }

  await deleteGitCredential({
    id: credentialId,
    userId: user.id
  });

  return {
    success: true
  };
});
