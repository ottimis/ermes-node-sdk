import * as fs from 'fs';
import { ErmesConfigurationError } from './errors/ErmesConfigurationError';
import type { NotificationConfigOptions } from './types/config';

export class NotificationConfig {
  readonly coreUrl: string;
  readonly tenantKey: string;
  readonly applicationId: string;
  readonly issuer: string;
  readonly apiKey: string;
  readonly apiSecret: string;
  readonly privateKeyPem: string;
  readonly kid: string;

  constructor(opts: NotificationConfigOptions) {
    this.coreUrl = opts.coreUrl.replace(/\/+$/, '');
    this.tenantKey = opts.tenantKey;
    this.applicationId = opts.applicationId;
    this.issuer = opts.issuer;
    this.apiKey = opts.apiKey;
    this.apiSecret = opts.apiSecret;
    this.privateKeyPem = opts.privateKeyPem;
    this.kid = opts.kid ?? 'key-1';
  }

  static fromEnv(env: NodeJS.ProcessEnv = process.env): NotificationConfig {
    const required = (name: string): string => {
      const v = env[name];
      if (!v) {
        throw new ErmesConfigurationError(`Ermes SDK: missing required env var ${name}`);
      }
      return v;
    };

    return new NotificationConfig({
      coreUrl: required('NOTIFICATION_CORE_URL'),
      tenantKey: required('NOTIFICATION_TENANT_KEY'),
      applicationId: required('NOTIFICATION_APPLICATION_ID'),
      issuer: required('NOTIFICATION_ISSUER'),
      apiKey: required('NOTIFICATION_API_KEY'),
      apiSecret: required('NOTIFICATION_API_SECRET'),
      privateKeyPem: NotificationConfig.loadKeyFromEnv(env),
      kid: env['NOTIFICATION_KID'] || 'key-1',
    });
  }

  private static loadKeyFromEnv(env: NodeJS.ProcessEnv): string {
    const path = env['NOTIFICATION_RSA_PRIVATE_KEY_PATH'];
    if (path && fs.existsSync(path)) {
      return fs.readFileSync(path, 'utf8');
    }
    const inline = env['NOTIFICATION_RSA_PRIVATE_KEY'];
    if (inline) {
      return inline.replace(/\\n/g, '\n');
    }
    throw new ErmesConfigurationError(
      'Ermes SDK: private key not configured. Set NOTIFICATION_RSA_PRIVATE_KEY or NOTIFICATION_RSA_PRIVATE_KEY_PATH.',
    );
  }
}
