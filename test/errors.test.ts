import {
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
  ErmesParseError,
  mapHttpError,
} from '../src/errors';

describe('error class hierarchy', () => {
  it('all errors are subclasses of ErmesError / Error', () => {
    const err = new ErmesNotFoundError('x', {
      status: 404,
      responseBody: null,
      requestUrl: 'u',
      requestMethod: 'GET',
    });
    expect(err).toBeInstanceOf(ErmesNotFoundError);
    expect(err).toBeInstanceOf(ErmesHttpError);
    expect(err).toBeInstanceOf(ErmesError);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ErmesNotFoundError');
  });

  it('timeout error inherits from network error', () => {
    const t = new ErmesTimeoutError('slow');
    expect(t).toBeInstanceOf(ErmesNetworkError);
    expect(t).toBeInstanceOf(ErmesError);
    expect(t.code).toBe('ERMES_TIMEOUT');
  });

  it('network default code is ERMES_NETWORK', () => {
    const n = new ErmesNetworkError('off');
    expect(n.code).toBe('ERMES_NETWORK');
  });

  it('parse error keeps rawBody and code ERMES_PARSE', () => {
    const e = new ErmesParseError('bad json', { rawBody: 'oops' });
    expect(e.code).toBe('ERMES_PARSE');
    expect(e.rawBody).toBe('oops');
  });
});

describe('mapHttpError', () => {
  const base = { url: 'https://x', method: 'GET' as const };

  it.each<[number, new (...args: never[]) => ErmesHttpError, string]>([
    [400, ErmesBadRequestError, 'ERMES_BAD_REQUEST'],
    [401, ErmesUnauthorizedError, 'ERMES_UNAUTHORIZED'],
    [403, ErmesForbiddenError, 'ERMES_FORBIDDEN'],
    [404, ErmesNotFoundError, 'ERMES_NOT_FOUND'],
    [409, ErmesConflictError, 'ERMES_CONFLICT'],
    [422, ErmesValidationError, 'ERMES_VALIDATION'],
    [500, ErmesInternalServerError, 'ERMES_INTERNAL'],
    [502, ErmesBadGatewayError, 'ERMES_BAD_GATEWAY'],
    [503, ErmesServiceUnavailableError, 'ERMES_UNAVAILABLE'],
    [504, ErmesGatewayTimeoutError, 'ERMES_GATEWAY_TIMEOUT'],
  ])('maps status %i to the right class', (status, Cls, code) => {
    const e = mapHttpError({ ...base, status, rawBody: '' });
    expect(e).toBeInstanceOf(Cls);
    expect(e.status).toBe(status);
    expect(e.code).toBe(code);
    expect(e.requestUrl).toBe('https://x');
    expect(e.requestMethod).toBe('GET');
  });

  it('falls back to ErmesUnexpectedStatusError for unknown statuses', () => {
    const e = mapHttpError({ ...base, status: 418, rawBody: '' });
    expect(e).toBeInstanceOf(ErmesUnexpectedStatusError);
    expect(e.code).toBe('ERMES_UNEXPECTED_STATUS');
    expect(e.status).toBe(418);
  });

  it('parses Retry-After (seconds) for 429', () => {
    const e = mapHttpError({
      ...base,
      status: 429,
      rawBody: '',
      headers: { 'retry-after': '30' },
    }) as ErmesRateLimitError;
    expect(e).toBeInstanceOf(ErmesRateLimitError);
    expect(e.retryAfterSeconds).toBe(30);
  });

  it('parses JSON response body when available', () => {
    const e = mapHttpError({
      ...base,
      status: 404,
      rawBody: JSON.stringify({ message: 'not here' }),
    });
    expect(e.responseBody).toEqual({ message: 'not here' });
    expect(e.message).toContain('not here');
  });

  it('keeps responseBody as null for non-JSON body', () => {
    const e = mapHttpError({ ...base, status: 500, rawBody: '<html>500</html>' });
    expect(e.responseBody).toBeNull();
  });
});
