import { vi } from "vitest";

type QueryResult<T = unknown> = {
  data: T;
  error: unknown;
};

function normalizeResult<T>(result: Partial<QueryResult<T>> = {}): QueryResult<T | null> {
  return {
    data: (result.data ?? null) as T | null,
    error: result.error ?? null,
  };
}

export function createQueryChain<T>(result: Partial<QueryResult<T>> = {}) {
  const normalized = normalizeResult(result);
  const promise = Promise.resolve(normalized);

  const chain: Record<string, unknown> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(normalized)),
    maybeSingle: vi.fn(() => Promise.resolve(normalized)),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };

  return chain as {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    neq: ReturnType<typeof vi.fn>;
    order: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    insert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    single: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
    then: Promise<QueryResult<T | null>>["then"];
    catch: Promise<QueryResult<T | null>>["catch"];
    finally: Promise<QueryResult<T | null>>["finally"];
  };
}

export function createFromStub() {
  const queuedChains = new Map<string, ReturnType<typeof createQueryChain>[]>();

  const from = vi.fn((table: string) => {
    const queue = queuedChains.get(table);

    if (!queue?.length) {
      throw new Error(`No Supabase mock queued for table: ${table}`);
    }

    return queue.shift();
  });

  function queue(table: string, chain: ReturnType<typeof createQueryChain>) {
    const existing = queuedChains.get(table) ?? [];
    existing.push(chain);
    queuedChains.set(table, existing);
    return chain;
  }

  return {
    from,
    queue,
  };
}
