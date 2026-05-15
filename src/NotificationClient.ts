import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { NotificationConfig } from './NotificationConfig';
import { HttpClient } from './internal/HttpClient';
import { ErmesConfigurationError } from './errors/ErmesConfigurationError';
import { ErmesParseError } from './errors/ErmesParseError';
import { mapHttpError } from './errors/mapHttpError';
import type { ErmesHttpMethod } from './errors/ErmesHttpError';
import type { EventInput, SendEventResult } from './types/events';
import type {
  InboxListResponse,
  ListParams,
  SyncParams,
  SyncResponse,
  UnreadCountResponse,
} from './types/inbox';
import type { JwtClaims, TokenWithInfo } from './types/jwt';
import type { JwksDocument, JwksKey } from './types/jwks';
import type { HttpResponseRaw } from './types/http';

const USER_TOKEN_TTL_SECONDS = 9 * 365 * 24 * 3600;
const DEFAULT_ROLES: ReadonlyArray<string> = ['operator'];
const DEFAULT_EVENT_NAME = 'notification.new';

export class NotificationClient {
  private readonly http: HttpClient;

  constructor(private readonly config: NotificationConfig) {
    this.http = new HttpClient();
  }

  getJwks(): JwksDocument {
    if (!this.config.privateKeyPem) {
      return { keys: [] };
    }
    const keyObj = crypto.createPrivateKey(this.config.privateKeyPem);
    const jwk = keyObj.export({ format: 'jwk' }) as { kty?: string; n?: string; e?: string };
    if (jwk.kty !== 'RSA' || !jwk.n || !jwk.e) {
      throw new ErmesConfigurationError('Ermes SDK: configured private key is not RSA');
    }
    const key: JwksKey = {
      kty: 'RSA',
      use: 'sig',
      alg: 'RS256',
      kid: this.config.kid,
      n: jwk.n,
      e: jwk.e,
    };
    return { keys: [key] };
  }

  createUserToken(userId: string, roles: string[] = [...DEFAULT_ROLES]): string {
    return this.createUserTokenWithInfo(userId, roles).token;
  }

  createUserTokenWithInfo(userId: string, roles: string[] = [...DEFAULT_ROLES]): TokenWithInfo {
    const now = Math.floor(Date.now() / 1000);
    const claims: JwtClaims = {
      tenant_id: this.config.tenantKey,
      roles,
      iss: this.config.issuer,
      aud: 'notification-platform',
      sub: userId,
      iat: now,
      exp: now + USER_TOKEN_TTL_SECONDS,
    };
    const token = jwt.sign(claims, this.config.privateKeyPem, {
      algorithm: 'RS256',
      keyid: this.config.kid,
    });
    return { token, info: claims };
  }

  async sendEvent(event: EventInput): Promise<SendEventResult> {
    const eventId = this.generateEventId();
    const payload: Record<string, unknown> = {
      event_id: eventId,
      tenant_key: this.config.tenantKey,
      application_id: this.config.applicationId,
      ...event,
      event_name: event.event_name ?? DEFAULT_EVENT_NAME,
    };
    const url = `${this.config.coreUrl}/api/v1/events`;
    const res = await this.http.post(url, payload, {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization:
        'Basic ' +
        Buffer.from(`${this.config.apiKey}:${this.config.apiSecret}`).toString('base64'),
    });
    this.ensureStatus(res, url, 'POST', [202]);
    return { eventId, body: this.parseJson(res.body) };
  }

  async getNotifications(
    userId: string,
    params: ListParams = {},
  ): Promise<InboxListResponse> {
    const url = this.appendQuery(
      `${this.config.coreUrl}/api/v1/notifications`,
      params as Record<string, string | number | undefined>,
    );
    const res = await this.http.get(url, this.bearerHeaders(userId));
    this.ensureStatus(res, url, 'GET', [200]);
    return this.parseJsonStrict<InboxListResponse>(res.body, url, 'GET');
  }

  async getUnreadCount(userId: string): Promise<UnreadCountResponse> {
    const url = `${this.config.coreUrl}/api/v1/notifications/unread-count`;
    const res = await this.http.get(url, this.bearerHeaders(userId));
    this.ensureStatus(res, url, 'GET', [200]);
    return this.parseJsonStrict<UnreadCountResponse>(res.body, url, 'GET');
  }

  async syncNotifications(
    userId: string,
    params: SyncParams = {},
  ): Promise<SyncResponse> {
    const url = this.appendQuery(
      `${this.config.coreUrl}/api/v1/notifications/sync`,
      params as Record<string, string | number | undefined>,
    );
    const res = await this.http.get(url, this.bearerHeaders(userId));
    this.ensureStatus(res, url, 'GET', [200]);
    return this.parseJsonStrict<SyncResponse>(res.body, url, 'GET');
  }

  async markAsRead(uuid: string, userId: string): Promise<void> {
    const url = `${this.config.coreUrl}/api/v1/notifications/${encodeURIComponent(uuid)}/read`;
    const res = await this.http.post(url, {}, this.bearerHeaders(userId));
    this.ensureStatus(res, url, 'POST', [200, 204]);
  }

  async markBulkRead(uuids: string[], userId: string): Promise<void> {
    const url = `${this.config.coreUrl}/api/v1/notifications/read`;
    const res = await this.http.post(
      url,
      { notification_uuids: uuids },
      this.bearerHeaders(userId),
    );
    this.ensureStatus(res, url, 'POST', [200, 204]);
  }

  async markAllAsRead(userId: string): Promise<void> {
    const url = `${this.config.coreUrl}/api/v1/notifications/read-all`;
    const res = await this.http.post(url, {}, this.bearerHeaders(userId));
    this.ensureStatus(res, url, 'POST', [200, 204]);
  }

  private ensureStatus(
    res: HttpResponseRaw,
    url: string,
    method: ErmesHttpMethod,
    expected: number[],
  ): void {
    if (!expected.includes(res.statusCode)) {
      throw mapHttpError({
        status: res.statusCode,
        rawBody: res.body,
        url,
        method,
        headers: res.headers,
      });
    }
  }

  private parseJsonStrict<T>(raw: string, url: string, method: ErmesHttpMethod): T {
    if (!raw) {
      throw new ErmesParseError(
        `Ermes ${method} ${url} returned empty body where JSON was expected`,
        { rawBody: raw },
      );
    }
    try {
      return JSON.parse(raw) as T;
    } catch (err) {
      throw new ErmesParseError(
        `Ermes ${method} ${url} returned non-JSON body`,
        { rawBody: raw, cause: err },
      );
    }
  }

  private bearerHeaders(userId: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: 'Bearer ' + this.createUserToken(userId),
    };
  }

  private generateEventId(): string {
    const ms = Date.now();
    const rand = crypto.randomBytes(3).toString('hex');
    return `evt-${ms}-${rand}`;
  }

  private appendQuery(
    url: string,
    params: Record<string, string | number | undefined>,
  ): string {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
    if (entries.length === 0) return url;
    const qs = entries
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    return `${url}?${qs}`;
  }

  private parseJson(raw: string): unknown | null {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
