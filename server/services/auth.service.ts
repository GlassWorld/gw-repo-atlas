import { prisma } from "../db/prisma";
import { hashPassword, verifyPassword } from "../utils/crypto";

export async function signUpUser(input: {
  loginId: string;
  name: string;
  password: string;
  email?: string | null;
}) {
  const existing = await prisma.user.findUnique({
    where: { loginId: input.loginId }
  });

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: "이미 사용 중인 로그인 ID입니다."
    });
  }

  return prisma.user.create({
    data: {
      loginId: input.loginId,
      email: input.email?.trim() || null,
      name: input.name,
      passwordHash: hashPassword(input.password)
    }
  });
}

export async function loginUser(input: {
  loginId: string;
  password: string;
}) {
  const user = await prisma.user.findUnique({
    where: { loginId: input.loginId }
  });

  if (!user || !verifyPassword(input.password, user.passwordHash)) {
    throw createError({
      statusCode: 401,
      statusMessage: "로그인 ID 또는 비밀번호가 올바르지 않습니다."
    });
  }

  return user;
}
