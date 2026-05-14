export { NotificationClient } from './NotificationClient';
export { NotificationConfig } from './NotificationConfig';

export type { NotificationConfigOptions } from './types/config';
export type {
  EventInput,
  EventSeverity,
  SendEventResult,
} from './types/events';
export type {
  InboxItem,
  Pagination,
  ListParams,
  InboxListResponse,
  SyncParams,
  SyncResponse,
  UnreadCountResponse,
} from './types/inbox';
export type { JwtClaims, TokenWithInfo } from './types/jwt';
export type { JwksKey, JwksDocument } from './types/jwks';
export type { HttpResponseRaw } from './types/http';

export {
  ErmesError,
  ErmesHttpError,
  ErmesBadRequestError,
  ErmesUnauthorizedError,
  ErmesForbiddenError,
  ErmesNotFoundError,
  ErmesConflictError,
  ErmesValidationError,
  ErmesRateLimitError,
  ErmesInternalServerError,
  ErmesBadGatewayError,
  ErmesServiceUnavailableError,
  ErmesGatewayTimeoutError,
  ErmesUnexpectedStatusError,
  ErmesNetworkError,
  ErmesTimeoutError,
  ErmesConfigurationError,
  ErmesParseError,
  mapHttpError,
} from './errors';
export type {
  ErmesErrorOptions,
  ErmesHttpErrorOptions,
  ErmesHttpMethod,
  ErmesRateLimitErrorOptions,
  ErmesParseErrorOptions,
  MapHttpErrorArgs,
} from './errors';
