export interface HttpResponseRaw {
  body: string;
  statusCode: number;
  headers: Record<string, string>;
}
