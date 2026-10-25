export function isActiveProfile<T extends { aktif?: unknown }>(profile: T | null | undefined): profile is T & { aktif: true };
