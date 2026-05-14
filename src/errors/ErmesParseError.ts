import { ErmesError, type ErmesErrorOptions } from './ErmesError';

export interface ErmesParseErrorOptions extends Omit<ErmesErrorOptions, 'code'> {
  rawBody: string;
}

export class ErmesParseError extends ErmesError {
  readonly rawBody: string;

  constructor(message: string, opts: ErmesParseErrorOptions) {
    const { rawBody, ...rest } = opts;
    super(message, { ...rest, code: 'ERMES_PARSE' });
    this.rawBody = rawBody;
  }
}
