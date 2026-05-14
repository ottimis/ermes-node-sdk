import * as crypto from 'crypto';
import { NotificationConfig } from '../src/NotificationConfig';
import { NotificationClient } from '../src/NotificationClient';
import { ErmesConfigurationError } from '../src/errors';

function makeRsaKey(): string {
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  }).privateKey;
}

function makeEcKey(): string {
  return crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256',
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  }).privateKey;
}

describe('NotificationConfig.fromEnv', () => {
  it('throws ErmesConfigurationError when required vars are missing', () => {
    expect(() => NotificationConfig.fromEnv({})).toThrow(ErmesConfigurationError);
  });

  it('throws ErmesConfigurationError when private key is not configured', () => {
    expect(() =>
      NotificationConfig.fromEnv({
        NOTIFICATION_CORE_URL: 'https://x',
        NOTIFICATION_TENANT_KEY: 't',
        NOTIFICATION_APPLICATION_ID: 'a',
        NOTIFICATION_ISSUER: 'https://i',
        NOTIFICATION_API_KEY: 'k',
        NOTIFICATION_API_SECRET: 's',
      }),
    ).toThrow(ErmesConfigurationError);
  });

  it('reads inline private key with escaped newlines', () => {
    const key = makeRsaKey();
    const cfg = NotificationConfig.fromEnv({
      NOTIFICATION_CORE_URL: 'https://x',
      NOTIFICATION_TENANT_KEY: 't',
      NOTIFICATION_APPLICATION_ID: 'a',
      NOTIFICATION_ISSUER: 'https://i',
      NOTIFICATION_API_KEY: 'k',
      NOTIFICATION_API_SECRET: 's',
      NOTIFICATION_RSA_PRIVATE_KEY: key.replace(/\n/g, '\\n'),
    });
    expect(cfg.privateKeyPem).toContain('BEGIN PRIVATE KEY');
  });
});

describe('NotificationClient.getJwks', () => {
  it('throws ErmesConfigurationError when configured key is not RSA', () => {
    const cfg = new NotificationConfig({
      coreUrl: 'https://x',
      tenantKey: 't',
      applicationId: 'a',
      issuer: 'https://i',
      apiKey: 'k',
      apiSecret: 's',
      privateKeyPem: makeEcKey(),
    });
    const client = new NotificationClient(cfg);
    expect(() => client.getJwks()).toThrow(ErmesConfigurationError);
  });

  it('returns empty JWKS when no private key is set', () => {
    const cfg = new NotificationConfig({
      coreUrl: 'https://x',
      tenantKey: 't',
      applicationId: 'a',
      issuer: 'https://i',
      apiKey: 'k',
      apiSecret: 's',
      privateKeyPem: '',
    });
    const client = new NotificationClient(cfg);
    expect(client.getJwks()).toEqual({ keys: [] });
  });
});
