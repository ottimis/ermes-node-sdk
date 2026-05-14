import axios, { AxiosInstance } from 'axios';
import { ErmesNetworkError, ErmesTimeoutError } from '../errors/network';
import type { HttpResponseRaw } from '../types/http';

export class HttpClient {
  private readonly axios: AxiosInstance;

  constructor(timeoutMs: number = 10_000) {
    this.axios = axios.create({
      timeout: timeoutMs,
      validateStatus: () => true,
      transformResponse: [(data: unknown): string => {
        if (typeof data === 'string') return data;
        if (data == null) return '';
        return JSON.stringify(data);
      }],
    });
  }

  async get(url: string, headers: Record<string, string> = {}): Promise<HttpResponseRaw> {
    try {
      const res = await this.axios.get<string>(url, { headers, responseType: 'text' });
      return {
        body: typeof res.data === 'string' ? res.data : '',
        statusCode: res.status,
        headers: normalizeHeaders(res.headers),
      };
    } catch (err) {
      throw toNetworkError(err, 'GET', url);
    }
  }

  async post(
    url: string,
    data: unknown,
    headers: Record<string, string> = {},
  ): Promise<HttpResponseRaw> {
    const payload = JSON.stringify(data ?? {});
    try {
      const res = await this.axios.post<string>(url, payload, {
        headers,
        responseType: 'text',
        transformRequest: [(d: unknown): unknown => d],
      });
      return {
        body: typeof res.data === 'string' ? res.data : '',
        statusCode: res.status,
        headers: normalizeHeaders(res.headers),
      };
    } catch (err) {
      throw toNetworkError(err, 'POST', url);
    }
  }
}

function toNetworkError(err: unknown, method: 'GET' | 'POST', url: string): Error {
  if (axios.isAxiosError(err)) {
    const message = `Ermes ${method} ${url} network failure: ${err.message}`;
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return new ErmesTimeoutError(message, { cause: err });
    }
    return new ErmesNetworkError(message, { cause: err });
  }
  if (err instanceof Error) {
    return new ErmesNetworkError(
      `Ermes ${method} ${url} unexpected error: ${err.message}`,
      { cause: err },
    );
  }
  return new ErmesNetworkError(`Ermes ${method} ${url} unknown error`, { cause: err });
}

function normalizeHeaders(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string') out[k.toLowerCase()] = v;
    else if (typeof v === 'number') out[k.toLowerCase()] = String(v);
    else if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') {
      out[k.toLowerCase()] = v[0] as string;
    }
  }
  return out;
}
