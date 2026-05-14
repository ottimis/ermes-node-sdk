export { ErmesError, type ErmesErrorOptions } from './ErmesError';
export {
  ErmesHttpError,
  type ErmesHttpErrorOptions,
  type ErmesHttpMethod,
} from './ErmesHttpError';
export {
  ErmesBadRequestError,
  ErmesUnauthorizedError,
  ErmesForbiddenError,
  ErmesNotFoundError,
  ErmesConflictError,
  ErmesValidationError,
  ErmesRateLimitError,
  type ErmesRateLimitErrorOptions,
} from './client';
export {
  ErmesInternalServerError,
  ErmesBadGatewayError,
  ErmesServiceUnavailableError,
  ErmesGatewayTimeoutError,
  ErmesUnexpectedStatusError,
} from './server';
export { ErmesNetworkError, ErmesTimeoutError } from './network';
export { ErmesConfigurationError } from './ErmesConfigurationError';
export { ErmesParseError, type ErmesParseErrorOptions } from './ErmesParseError';
export { mapHttpError, type MapHttpErrorArgs } from './mapHttpError';
