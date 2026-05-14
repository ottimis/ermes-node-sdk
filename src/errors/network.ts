import { ErmesError, type ErmesErrorOptions } from './ErmesError';

export class ErmesNetworkError extends ErmesError {
  constructor(message: string, opts: ErmesErrorOptions = {}) {
    super(message, { ...opts, code: opts.code ?? 'ERMES_NETWORK' });
  }
}

export class ErmesTimeoutError extends ErmesNetworkError {
  constructor(message: string, opts: Omit<ErmesErrorOptions, 'code'> = {}) {
    super(message, { ...opts, code: 'ERMES_TIMEOUT' });
  }
}
