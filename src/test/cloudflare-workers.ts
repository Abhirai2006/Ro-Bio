// Test stand-in for the "cloudflare:workers" module, which only exists inside the Workers runtime.
// vitest.config.ts points the import here, so a Durable Object class can be built in a unit test.
export class DurableObject<Env = unknown> {
  protected ctx: DurableObjectState;
  protected env: Env;
  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
}
