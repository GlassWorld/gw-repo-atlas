import { signUpUser } from "../../services/auth.service";

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    loginId?: string;
    name?: string;
    password?: string;
    email?: string;
  }>(event);

  if (!body?.loginId || !body.name || !body.password) {
    throw createError({
      statusCode: 400,
      statusMessage: "loginId, name, password는 모두 필수입니다."
    });
  }

  const user = await signUpUser({
    loginId: body.loginId.trim(),
    name: body.name.trim(),
    password: body.password,
    email: body.email?.trim().toLowerCase()
  });

  return {
    user: {
      id: user.id,
      loginId: user.loginId,
      email: user.email,
      name: user.name
    }
  };
});
