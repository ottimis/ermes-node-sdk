import { ErmesHttpError, type ErmesHttpErrorOptions } from './ErmesHttpError';

export class ErmesInternalServerError extends ErmesHttpError {
  constructor(message: string, opts: Omit<ErmesHttpErrorOptions, 'code'>) {
    super(message, { ...opts, code: 'ERMES_INTERNAL' });
  }
}

export class ErmesBadGatewayError extends ErmesHttpError {
  constructor(message: string, opts: Omit<ErmesHttpErrorOptions, 'code'>) {
    super(message, { ...opts, code: 'ERMES_BAD_GATEWAY' });
  }
}

export class ErmesServiceUnavailableError extends ErmesHttpError {
  constructor(message: string, opts: Omit<ErmesHttpErrorOptions, 'code'>) {
    super(message, { ...opts, code: 'ERMES_UNAVAILABLE' });
  }
}

export class ErmesGatewayTimeoutError extends ErmesHttpError {
  constructor(message: string, opts: Omit<ErmesHttpErrorOptions, 'code'>) {
    super(message, { ...opts, code: 'ERMES_GATEWAY_TIMEOUT' });
  }
}

export class ErmesUnexpectedStatusError extends ErmesHttpError {
  constructor(message: string, opts: Omit<ErmesHttpErrorOptions, 'code'>) {
    super(message, { ...opts, code: 'ERMES_UNEXPECTED_STATUS' });
  }
}
