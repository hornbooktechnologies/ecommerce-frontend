import type { ListQuery, PaginatedResponse } from '@/types/index';

const DEFAULT_DELAY = Number(process.env.NEXT_PUBLIC_MOCK_DELAY_MS || 180);
export async function mockDelay(ms = DEFAULT_DELAY) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
export function mockId(prefix: string, index: number) {
  return `${prefix}_${String(index).padStart(8, '0')}`;
}
export function paginate<T>(
  items: T[],
  query: ListQuery = {},
): PaginatedResponse<T> {
  const page = Math.max(1, query.page || 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize || 12));
  const total = items.length;
  return {
    data: items.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}
export function sortRecords<T>(
  items: T[],
  key?: string,
  direction: 'asc' | 'desc' = 'asc',
) {
  if (!key) return items;
  return [...items].sort((a, b) => {
    const left = String((a as Record<string, unknown>)[key] ?? '');
    const right = String((b as Record<string, unknown>)[key] ?? '');
    return (
      left.localeCompare(right, undefined, { numeric: true }) *
      (direction === 'asc' ? 1 : -1)
    );
  });
}
export function requireRecord<T>(value: T | undefined, label: string): T {
  if (!value) throw new Error(`${label} was not found`);
  return value;
}
