import * as crypto from 'crypto';
import { NotificationClient } from '../src/NotificationClient';
import { NotificationConfig } from '../src/NotificationConfig';
import { HttpClient } from '../src/internal/HttpClient';
import {
  ErmesUnauthorizedError,
  ErmesValidationError,
  ErmesInternalServerError,
  ErmesNetworkError,
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
      tenantKey: 'tenant-a',
      applicationId: 'app-a',
      issuer: 'https://issuer.test',
      apiKey: 'ak-123',
      apiSecret: 'as-456',
      privateKeyPem: makeKey(),
    }),
  );
}

describe('NotificationClient.sendEvent', () => {
  afterEach(() => jest.restoreAllMocks());

  it('injects event_id / tenant_key / application_id and uses Basic auth on 202', async () => {
    const client = makeClient();

    const captured: { url: string; headers: Record<string, string>; body: unknown } = {
      url: '',
      headers: {},
      body: undefined,
    };
    jest
      .spyOn(HttpClient.prototype, 'post')
      .mockImplementation(async (url, data, headers) => {
        captured.url = url;
        captured.body = data;
        captured.headers = headers ?? {};
        return {
          body: JSON.stringify({ accepted: true }),
          statusCode: 202,
          headers: {},
        };
      });

    const res = await client.sendEvent({
      topic: 'x.y',
      title: 'Test',
      recipient_users: ['u1'],
    });

    expect(captured.url).toBe('https://ermes.test/api/v1/events');
    expect(captured.headers['Authorization']).toBe(
      'Basic ' + Buffer.from('ak-123:as-456').toString('base64'),
    );
    const sent = captured.body as Record<string, unknown>;
    expect(sent['tenant_key']).toBe('tenant-a');
    expect(sent['application_id']).toBe('app-a');
    expect(typeof sent['event_id']).toBe('string');
    expect((sent['event_id'] as string).startsWith('evt-')).toBe(true);
    expect(sent['topic']).toBe('x.y');

    expect(res.eventId).toEqual(sent['event_id']);
    expect(res.body).toEqual({ accepted: true });
  });

  it("defaults event_name to 'notification.new' when omitted", async () => {
    const client = makeClient();
    let captured: Record<string, unknown> = {};
    jest
      .spyOn(HttpClient.prototype, 'post')
      .mockImplementation(async (_url, data) => {
        captured = data as Record<string, unknown>;
        return { body: '{}', statusCode: 202, headers: {} };
      });

    await client.sendEvent({
      topic: 'x.y',
      title: 'Test',
      recipient_users: ['u1'],
    });

    expect(captured['event_name']).toBe('notification.new');
  });

  it('preserves caller-provided event_name', async () => {
    const client = makeClient();
    let captured: Record<string, unknown> = {};
    jest
      .spyOn(HttpClient.prototype, 'post')
      .mockImplementation(async (_url, data) => {
        captured = data as Record<string, unknown>;
        return { body: '{}', statusCode: 202, headers: {} };
      });

    await client.sendEvent({
      topic: 'x.y',
      title: 'Test',
      recipient_users: ['u1'],
      event_name: 'custom.event',
    });

    expect(captured['event_name']).toBe('custom.event');
  });

  it('throws ErmesUnauthorizedError on 401', async () => {
    const client = makeClient();
    jest.spyOn(HttpClient.prototype, 'post').mockResolvedValue({
      body: JSON.stringify({ message: 'bad credentials' }),
      statusCode: 401,
      headers: {},
    });

    await expect(
      client.sendEvent({ topic: 't', title: 'T', recipient_users: ['u1'] }),
    ).rejects.toBeInstanceOf(ErmesUnauthorizedError);
  });

  it('throws ErmesValidationError on 422 with response body attached', async () => {
    const client = makeClient();
    const body = { message: 'invalid', errors: { topic: ['required'] } };
    jest.spyOn(HttpClient.prototype, 'post').mockResolvedValue({
      body: JSON.stringify(body),
      statusCode: 422,
      headers: {},
    });

    try {
      await client.sendEvent({ topic: '', title: '', recipient_users: [] });
      fail('expected throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ErmesValidationError);
      const err = e as ErmesValidationError;
      expect(err.status).toBe(422);
      expect(err.code).toBe('ERMES_VALIDATION');
      expect(err.responseBody).toEqual(body);
      expect(err.requestMethod).toBe('POST');
    }
  });

  it('throws ErmesInternalServerError on 500', async () => {
    const client = makeClient();
    jest.spyOn(HttpClient.prototype, 'post').mockResolvedValue({
      body: '',
      statusCode: 500,
      headers: {},
    });
    await expect(
      client.sendEvent({ topic: 't', title: 'T', recipient_users: ['u1'] }),
    ).rejects.toBeInstanceOf(ErmesInternalServerError);
  });

  it('throws ErmesNetworkError when HttpClient propagates network failure', async () => {
    const client = makeClient();
    jest
      .spyOn(HttpClient.prototype, 'post')
      .mockRejectedValue(new ErmesNetworkError('boom'));
    await expect(
      client.sendEvent({ topic: 't', title: 'T', recipient_users: ['u1'] }),
    ).rejects.toBeInstanceOf(ErmesNetworkError);
  });
});
