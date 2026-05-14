export interface ErmesErrorOptions {
  code?: string;
  cause?: unknown;
}

export abstract class ErmesError extends Error {
  readonly code: string;
  readonly cause?: unknown;

  constructor(message: string, opts: ErmesErrorOptions = {}) {
    super(message);
    this.name = new.target.name;
    this.code = opts.code ?? 'ERMES_ERROR';
    if (opts.cause !== undefined) {
      this.cause = opts.cause;
    }
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
