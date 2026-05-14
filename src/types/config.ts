export interface NotificationConfigOptions {
  coreUrl: string;
  tenantKey: string;
  applicationId: string;
  issuer: string;
  apiKey: string;
  apiSecret: string;
  privateKeyPem: string;
  kid?: string;
}
