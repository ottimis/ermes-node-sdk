import { ErmesHttpError, type ErmesHttpErrorOptions } from './ErmesHttpError';

export class ErmesBadRequestError extends ErmesHttpError {
  constructor(message: string, opts: Omit<ErmesHttpErrorOptions, 'code'>) {
    super(message, { ...opts, code: 'ERMES_BAD_REQUEST' });
  }
}

export class ErmesUnauthorizedError extends ErmesHttpError {
  constructor(message: string, opts: Omit<ErmesHttpErrorOptions, 'code'>) {
    super(message, { ...opts, code: 'ERMES_UNAUTHORIZED' });
  }
}

export class ErmesForbiddenError extends ErmesHttpError {
  constructor(message: string, opts: Omit<ErmesHttpErrorOptions, 'code'>) {
    super(message, { ...opts, code: 'ERMES_FORBIDDEN' });
  }
}

export class ErmesNotFoundError extends ErmesHttpError {
  constructor(message: string, opts: Omit<ErmesHttpErrorOptions, 'code'>) {
    super(message, { ...opts, code: 'ERMES_NOT_FOUND' });
  }
}

export class ErmesConflictError extends ErmesHttpError {
  constructor(message: string, opts: Omit<ErmesHttpErrorOptions, 'code'>) {
    super(message, { ...opts, code: 'ERMES_CONFLICT' });
  }
}

export class ErmesValidationError extends ErmesHttpError {
  constructor(message: string, opts: Omit<ErmesHttpErrorOptions, 'code'>) {
    super(message, { ...opts, code: 'ERMES_VALIDATION' });
  }
}

export interface ErmesRateLimitErrorOptions extends Omit<ErmesHttpErrorOptions, 'code'> {
  retryAfterSeconds?: number;
}

export class ErmesRateLimitError extends ErmesHttpError {
  readonly retryAfterSeconds?: number;

  constructor(message: string, opts: ErmesRateLimitErrorOptions) {
    const { retryAfterSeconds, ...rest } = opts;
    super(message, { ...rest, code: 'ERMES_RATE_LIMIT' });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
