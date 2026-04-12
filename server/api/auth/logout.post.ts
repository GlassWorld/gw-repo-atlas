import { clearAccessTokenCookie } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  clearAccessTokenCookie(event);

  return {
    ok: true
  };
});
