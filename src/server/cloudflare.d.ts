// The few Cloudflare Workers types the judge scoring needs. Kept here so the project does not need
// another package. They match the Workers runtime API for SQLite-backed Durable Objects.
declare module "cloudflare:workers" {
  export abstract class DurableObject<Env = unknown> {
    protected ctx: DurableObjectState;
    protected env: Env;
    constructor(ctx: DurableObjectState, env: Env);
  }
}

interface SqlCursor<T> extends Iterable<T> {
  toArray(): T[];
  one(): T;
  readonly rowsWritten: number;
}

interface DurableObjectState {
  readonly storage: {
    readonly sql: {
      exec<T = Record<string, string | number | null>>(
        query: string,
        ...bindings: unknown[]
      ): SqlCursor<T>;
    };
  };
  blockConcurrencyWhile<T>(fn: () => Promise<T> | T): Promise<T>;
}

interface DurableObjectId {
  toString(): string;
}

interface DurableObjectNamespace<T = unknown> {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): {
    [K in keyof T]: T[K] extends (...a: infer A) => infer R
      ? (...a: A) => Promise<Awaited<R>>
      : never;
  };
}
