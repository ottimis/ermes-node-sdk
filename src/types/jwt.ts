export interface JwtClaims {
  tenant_id: string;
  roles: string[];
  iss: string;
  aud: 'notification-platform';
  sub: string;
  iat: number;
  exp: number;
}

export interface TokenWithInfo {
  token: string;
  info: JwtClaims;
}
