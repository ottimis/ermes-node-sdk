import * as crypto from 'crypto';
import { NotificationClient } from '../src/NotificationClient';
import { NotificationConfig } from '../src/NotificationConfig';
import { HttpClient } from '../src/internal/HttpClient';
import {
  ErmesNotFoundError,
  ErmesParseError,
  ErmesRateLimitError,
  ErmesUnauthorizedError,
} from '../src/errors';

function makeKey(): string {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  }).privateKey;
}

function makeClient(): NotificationClient {
  return new NotificationClient(
    new NotificationConfig({
      coreUrl: 'https://ermes.test',
      tenantKey: 't',
      applicationId: 'a',
      issuer: 'https://i',
      apiKey: 'ak',
      apiSecret: 'as',
      privateKeyPem: makeKey(),
    }),
  );
}

describe('NotificationClient inbox methods', () => {
  afterEach(() => jest.restoreAllMocks());

  it('getNotifications returns typed body on 200', async () => {
    const client = makeClient();
    const body = {
      items: [],
      pagination: { page: 1, limit: 20, total: 0, nextCursor: null },
    };
    jest.spyOn(HttpClient.prototype, 'get').mockResolvedValue({
      body: JSON.stringify(body),
      statusCode: 200,
      headers: {},
    });
    const res = await client.getNotifications('u1');
    expect(res.items).toEqual([]);
    expect(res.pagination.page).toBe(1);
  });

  it('getNotifications throws ErmesUnauthorizedError on 401', async () => {
    const client = makeClient();
    jest.spyOn(HttpClient.prototype, 'get').mockResolvedValue({
      body: '',
      statusCode: 401,
      headers: {},
    });
    await expect(client.getNotifications('u1')).rejects.toBeInstanceOf(
      ErmesUnauthorizedError,
    );
  });

  it('getUnreadCount throws ErmesParseError when body is not JSON on 200', async () => {
    const client = makeClient();
    jest.spyOn(HttpClient.prototype, 'get').mockResolvedValue({
      body: 'not-json',
      statusCode: 200,
      headers: {},
    });
    await expect(client.getUnreadCount('u1')).rejects.toBeInstanceOf(ErmesParseError);
  });

  it('syncNotifications surfaces 404 as ErmesNotFoundError', async () => {
    const client = makeClient();
    jest.spyOn(HttpClient.prototype, 'get').mockResolvedValue({
      body: JSON.stringify({ message: 'gone' }),
      statusCode: 404,
      headers: {},
    });
    try {
      await client.syncNotifications('u1');
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ErmesNotFoundError);
      expect((e as ErmesNotFoundError).responseBody).toEqual({ message: 'gone' });
    }
  });

  it('markAsRead resolves to void on 204', async () => {
    const client = makeClient();
    jest.spyOn(HttpClient.prototype, 'post').mockResolvedValue({
      body: '',
      statusCode: 204,
      headers: {},
    });
    await expect(client.markAsRead('uuid-1', 'u1')).resolves.toBeUndefined();
  });

  it('markBulkRead throws ErmesRateLimitError with retryAfterSeconds on 429', async () => {
    const client = makeClient();
    jest.spyOn(HttpClient.prototype, 'post').mockResolvedValue({
      body: '',
      statusCode: 429,
      headers: { 'retry-after': '7' },
    });
    try {
      await client.markBulkRead(['a', 'b'], 'u1');
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ErmesRateLimitError);
      expect((e as ErmesRateLimitError).retryAfterSeconds).toBe(7);
    }
  });

  it('getNotifications forwards date-range and deleted filters as query string', async () => {
    const client = makeClient();
    const get = jest.spyOn(HttpClient.prototype, 'get').mockResolvedValue({
      body: JSON.stringify({
        items: [],
        pagination: { page: 1, limit: 20, total: 0, nextCursor: null },
      }),
      statusCode: 200,
      headers: {},
    });
    await client.getNotifications('u1', {
      created_after: '2026-06-07T00:00:00.000Z',
      created_before: '2026-06-08T00:00:00.000Z',
      deleted: 'only',
    });
    const url = get.mock.calls[0][0] as string;
    expect(url).toContain('created_after=2026-06-07T00%3A00%3A00.000Z');
    expect(url).toContain('created_before=2026-06-08T00%3A00%3A00.000Z');
    expect(url).toContain('deleted=only');
  });

  it('deleteNotification hits the /delete endpoint and resolves on 204', async () => {
    const client = makeClient();
    const post = jest.spyOn(HttpClient.prototype, 'post').mockResolvedValue({
      body: '',
      statusCode: 204,
      headers: {},
    });
    await expect(client.deleteNotification('uuid-1', 'u1')).resolves.toBeUndefined();
    expect(post.mock.calls[0][0]).toBe(
      'https://ermes.test/api/v1/notifications/uuid-1/delete',
    );
  });

  it('deleteBulk posts notification_uuids to the bulk delete endpoint', async () => {
    const client = makeClient();
    const post = jest.spyOn(HttpClient.prototype, 'post').mockResolvedValue({
      body: '',
      statusCode: 204,
      headers: {},
    });
    await client.deleteBulk(['a', 'b'], 'u1');
    expect(post.mock.calls[0][0]).toBe('https://ermes.test/api/v1/notifications/delete');
    expect(post.mock.calls[0][1]).toEqual({ notification_uuids: ['a', 'b'] });
  });

  it('restoreNotification hits the /restore endpoint', async () => {
    const client = makeClient();
    const post = jest.spyOn(HttpClient.prototype, 'post').mockResolvedValue({
      body: '',
      statusCode: 204,
      headers: {},
    });
    await client.restoreNotification('uuid-1', 'u1');
    expect(post.mock.calls[0][0]).toBe(
      'https://ermes.test/api/v1/notifications/uuid-1/restore',
    );
  });
});
