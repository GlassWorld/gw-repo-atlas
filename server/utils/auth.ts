import { createHmac, timingSafeEqual } from "node:crypto";
import { getCookie, setCookie, deleteCookie, H3Event } from "h3";
import { prisma } from "../db/prisma";

export const ACCESS_TOKEN_COOKIE_NAME = "repo_atlas_access_token";
const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 8;

interface JwtPayload {
  sub: string;
  loginId: string;
  name: string;
  exp: number;
  iat: number;
}

function getJwtSecret() {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) {
    throw createError({
      statusCode: 500,
      statusMessage: "AUTH_JWT_SECRET가 설정되지 않았습니다."
    });
  }

  return secret;
}

function base64UrlEncode(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function signSegment(data: string) {
  return createHmac("sha256", getJwtSecret())
    .update(data)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function issueAccessToken(user: {
  id: string;
  loginId: string;
  name: string;
}) {
  const header = base64UrlEncode(JSON.stringify({
    alg: "HS256",
    typ: "JWT"
  }));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(JSON.stringify({
    sub: user.id,
    loginId: user.loginId,
    name: user.name,
    iat: now,
    exp: now + ACCESS_TOKEN_MAX_AGE_SECONDS
  } satisfies JwtPayload));
  const signature = signSegment(`${header}.${payload}`);
  return `${header}.${payload}.${signature}`;
}

function verifyAccessToken(rawToken: string): JwtPayload | null {
  const [header, payload, signature] = rawToken.split(".");
  if (!header || !payload || !signature) {
    return null;
  }

  const expected = signSegment(`${header}.${payload}`);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const decoded = JSON.parse(base64UrlDecode(payload)) as JwtPayload;
    if (decoded.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

export async function getCurrentUser(event: H3Event) {
  const rawToken = getCookie(event, ACCESS_TOKEN_COOKIE_NAME);
  if (!rawToken) {
    return null;
  }

  const payload = verifyAccessToken(rawToken);
  if (!payload) {
    deleteCookie(event, ACCESS_TOKEN_COOKIE_NAME, { path: "/" });
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub }
  });

  if (!user) {
    deleteCookie(event, ACCESS_TOKEN_COOKIE_NAME, { path: "/" });
    return null;
  }

  return user;
}

export async function requireUser(event: H3Event) {
  const user = await getCurrentUser(event);
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: "로그인이 필요합니다."
    });
  }

  return user;
}

export function setAccessTokenCookie(event: H3Event, token: string) {
  setCookie(event, ACCESS_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
    path: "/"
  });
}

export function clearAccessTokenCookie(event: H3Event) {
  deleteCookie(event, ACCESS_TOKEN_COOKIE_NAME, { path: "/" });
}
