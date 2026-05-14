import { ErmesHttpError, type ErmesHttpMethod } from './ErmesHttpError';
import {
  ErmesBadRequestError,
  ErmesConflictError,
  ErmesForbiddenError,
  ErmesNotFoundError,
  ErmesRateLimitError,
  ErmesUnauthorizedError,
  ErmesValidationError,
} from './client';
import {
  ErmesBadGatewayError,
  ErmesGatewayTimeoutError,
  ErmesInternalServerError,
  ErmesServiceUnavailableError,
  ErmesUnexpectedStatusError,
} from './server';

export interface MapHttpErrorArgs {
  status: number;
  rawBody: string;
  url: string;
  method: ErmesHttpMethod;
  headers?: Record<string, string | undefined>;
}

export function mapHttpError(args: MapHttpErrorArgs): ErmesHttpError {
  const { status, rawBody, url, method, headers } = args;
  const responseBody = safeJsonParse(rawBody);
  const base = {
    status,
    responseBody,
    requestUrl: url,
    requestMethod: method,
  };
  const message = buildMessage(status, method, url, responseBody, rawBody);

  switch (status) {
    case 400:
      return new ErmesBadRequestError(message, base);
    case 401:
      return new ErmesUnauthorizedError(message, base);
    case 403:
      return new ErmesForbiddenError(message, base);
    case 404:
      return new ErmesNotFoundError(message, base);
    case 409:
      return new ErmesConflictError(message, base);
    case 422:
      return new ErmesValidationError(message, base);
    case 429:
      return new ErmesRateLimitError(message, {
        ...base,
        retryAfterSeconds: parseRetryAfter(headers?.['retry-after']),
      });
    case 500:
      return new ErmesInternalServerError(message, base);
    case 502:
      return new ErmesBadGatewayError(message, base);
    case 503:
      return new ErmesServiceUnavailableError(message, base);
    case 504:
      return new ErmesGatewayTimeoutError(message, base);
    default:
      return new ErmesUnexpectedStatusError(message, base);
  }
}

function buildMessage(
  status: number,
  method: ErmesHttpMethod,
  url: string,
  responseBody: unknown,
  rawBody: string,
): string {
  const serverMsg = extractServerMessage(responseBody) ?? truncate(rawBody, 200);
  const tail = serverMsg ? ` — ${serverMsg}` : '';
  return `Ermes ${method} ${url} failed with status ${status}${tail}`;
}

function extractServerMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const obj = body as Record<string, unknown>;
  const candidates = [obj['message'], obj['error'], obj['detail']];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim() !== '') return c;
  }
  return null;
}

function safeJsonParse(raw: string): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseRetryAfter(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) return n;
  const dateMs = Date.parse(raw);
  if (!Number.isNaN(dateMs)) {
    const delta = Math.max(0, Math.round((dateMs - Date.now()) / 1000));
    return delta;
  }
  return undefined;
}

function truncate(s: string, max: number): string {
  if (!s) return '';
  return s.length > max ? s.slice(0, max) + '…' : s;
}
