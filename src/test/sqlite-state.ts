// A Durable Object storage for unit tests, backed by Node's built-in SQLite, so store code runs its real SQL.
// Loaded at run time so the test bundler leaves Node's built-in module alone.
type Db = {
  prepare(q: string): {
    all(...b: never[]): unknown[];
    run(...b: never[]): { changes: number | bigint };
  };
};
const { DatabaseSync } = process.getBuiltinModule("node:sqlite") as unknown as {
  DatabaseSync: new (path: string) => Db;
};

export function sqliteState(): DurableObjectState {
  const db = new DatabaseSync(":memory:");
  return {
    storage: {
      sql: {
        exec<T>(query: string, ...bindings: unknown[]) {
          const stmt = db.prepare(query);
          const reads = /^\s*(SELECT|WITH)\b/i.test(query) || /\bRETURNING\b/i.test(query);
          const rows = (reads ? stmt.all(...(bindings as never[])) : []) as T[];
          const rowsWritten = reads ? 0 : Number(stmt.run(...(bindings as never[])).changes);
          return {
            toArray: () => rows,
            one: () => {
              if (!rows.length) throw new Error("No row");
              return rows[0]!;
            },
            rowsWritten,
            [Symbol.iterator]: () => rows[Symbol.iterator](),
          };
        },
      },
    },
    blockConcurrencyWhile: <T>(fn: () => Promise<T> | T) => Promise.resolve(fn()),
  };
}
