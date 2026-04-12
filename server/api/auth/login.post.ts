import { loginUser } from "../../services/auth.service";
import { issueAccessToken, setAccessTokenCookie } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    loginId?: string;
    password?: string;
  }>(event);

  if (!body?.loginId || !body.password) {
    throw createError({
      statusCode: 400,
      statusMessage: "loginId와 password는 필수입니다."
    });
  }

  const user = await loginUser({
    loginId: body.loginId.trim(),
    password: body.password
  });

  setAccessTokenCookie(event, issueAccessToken({
    id: user.id,
    loginId: user.loginId,
    name: user.name
  }));

  return {
    user: {
      id: user.id,
      loginId: user.loginId,
      email: user.email,
      name: user.name
    }
  };
});
