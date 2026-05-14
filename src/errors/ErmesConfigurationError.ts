import { ErmesError, type ErmesErrorOptions } from './ErmesError';

export class ErmesConfigurationError extends ErmesError {
  constructor(message: string, opts: Omit<ErmesErrorOptions, 'code'> = {}) {
    super(message, { ...opts, code: 'ERMES_CONFIG' });
  }
}
