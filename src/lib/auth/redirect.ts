const DEFAULT_AUTH_REDIRECT = "/studio";

export function getSafeAuthRedirect(value?: string | null): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    value === "/auth" ||
    value.startsWith("/auth/")
  ) {
    return DEFAULT_AUTH_REDIRECT;
  }

  return value;
}