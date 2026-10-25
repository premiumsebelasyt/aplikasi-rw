export function parseWargaCategoryIds(body: Record<string, unknown>): {
  ids: number[] | null;
  error?: string;
};
