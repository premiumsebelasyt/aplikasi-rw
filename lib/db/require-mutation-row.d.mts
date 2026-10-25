export function requireMutationRow<T>(
  data: T | null | undefined,
  error: { message?: string } | null | undefined,
  action: string,
): T;
