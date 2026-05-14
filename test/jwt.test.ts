import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { NotificationClient } from '../src/NotificationClient';
import { NotificationConfig } from '../src/NotificationConfig';

function makeRsaKeyPair(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { privateKey, publicKey };
}

describe('NotificationClient.createUserToken', () => {
  const { privateKey, publicKey } = makeRsaKeyPair();
  const config = new NotificationConfig({
    coreUrl: 'https://ermes.test/',
    tenantKey: 'tenant-a',
    applicationId: 'app-a',
    issuer: 'https://issuer.test',
    apiKey: 'ak',
    apiSecret: 'as',
    privateKeyPem: privateKey,
    kid: 'k-1',
  });
  const client = new NotificationClient(config);

  it('strips trailing slash from coreUrl', () => {
    expect(config.coreUrl).toBe('https://ermes.test');
  });

  it('signs a verifiable RS256 token with the expected claims', () => {
    const token = client.createUserToken('user-42');
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as Record<string, unknown>;
    expect(decoded['tenant_id']).toBe('tenant-a');
    expect(decoded['iss']).toBe('https://issuer.test');
    expect(decoded['aud']).toBe('notification-platform');
    expect(decoded['sub']).toBe('user-42');
    expect(decoded['roles']).toEqual(['operator']);
    expect(typeof decoded['iat']).toBe('number');
    expect(typeof decoded['exp']).toBe('number');
    expect(decoded['exp'] as number).toBeGreaterThan(decoded['iat'] as number);
  });

  it('accepts custom roles', () => {
    const token = client.createUserToken('user-42', ['operator', 'admin']);
    const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as Record<string, unknown>;
    expect(decoded['roles']).toEqual(['operator', 'admin']);
  });

  it('embeds kid in the JWT header', () => {
    const token = client.createUserToken('user-42');
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'));
    expect(header.kid).toBe('k-1');
    expect(header.alg).toBe('RS256');
  });

  it('createUserTokenWithInfo returns matching claims and a 9-year TTL', () => {
    const result = client.createUserTokenWithInfo('user-42');
    const ttl = result.info.exp - result.info.iat;
    expect(ttl).toBe(9 * 365 * 24 * 3600);
    const decoded = jwt.verify(result.token, publicKey, { algorithms: ['RS256'] }) as Record<string, unknown>;
    expect(decoded['sub']).toBe(result.info.sub);
    expect(decoded['exp']).toBe(result.info.exp);
  });
});

describe('NotificationClient.getJwks', () => {
  const { privateKey } = makeRsaKeyPair();
  const config = new NotificationConfig({
    coreUrl: 'https://ermes.test',
    tenantKey: 't',
    applicationId: 'a',
    issuer: 'https://i.test',
    apiKey: 'ak',
    apiSecret: 'as',
    privateKeyPem: privateKey,
    kid: 'k-xyz',
  });
  const client = new NotificationClient(config);

  it('exports a JWKS document with one RSA signing key', () => {
    const doc = client.getJwks();
    expect(doc.keys).toHaveLength(1);
    const k = doc.keys[0];
    expect(k.kty).toBe('RSA');
    expect(k.use).toBe('sig');
    expect(k.alg).toBe('RS256');
    expect(k.kid).toBe('k-xyz');
    expect(typeof k.n).toBe('string');
    expect(typeof k.e).toBe('string');
    // base64url: no '+' or '/' or '=' padding
    expect(k.n).not.toMatch(/[+/=]/);
    expect(k.e).not.toMatch(/[+/=]/);
  });
});
