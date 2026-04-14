interface AuthSessionUser {
  id: string;
  name: string;
  loginId: string;
  email: string | null;
}

export function useAuthSession() {
  const user = useState<AuthSessionUser | null>("auth-session-user", () => null);

  async function refresh() {
    const headers = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;
    const response = await $fetch<{ user: AuthSessionUser | null }>("/api/auth/me", {
      headers
    }).catch(() => ({ user: null }));

    user.value = response.user;
    return response.user;
  }

  function set(nextUser: AuthSessionUser | null) {
    user.value = nextUser;
  }

  function clear() {
    user.value = null;
  }

  return {
    user,
    refresh,
    set,
    clear
  };
}
