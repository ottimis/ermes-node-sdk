import { ErmesError, type ErmesErrorOptions } from './ErmesError';

export type ErmesHttpMethod = 'GET' | 'POST';

export interface ErmesHttpErrorOptions extends ErmesErrorOptions {
  status: number;
  responseBody: unknown;
  requestUrl: string;
  requestMethod: ErmesHttpMethod;
}

export abstract class ErmesHttpError extends ErmesError {
  readonly status: number;
  readonly responseBody: unknown;
  readonly requestUrl: string;
  readonly requestMethod: ErmesHttpMethod;

  constructor(message: string, opts: ErmesHttpErrorOptions) {
    super(message, { code: opts.code, cause: opts.cause });
    this.status = opts.status;
    this.responseBody = opts.responseBody;
    this.requestUrl = opts.requestUrl;
    this.requestMethod = opts.requestMethod;
  }
}
