import { getCurrentUser } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const user = await getCurrentUser(event);

  return {
    user: user
      ? {
          id: user.id,
          loginId: user.loginId,
          email: user.email,
          name: user.name
        }
      : null
  };
});
