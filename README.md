# ermes-node-sdk

Node/TypeScript SDK for the Ermes notification platform. Port of [`ermes-php-sdk`](../ermes-php-sdk-main) with the same wire-level behavior, plus full TypeScript typings on config, request input, and response output.

## Requirements

- Node.js 24+
- RSA private key (PEM) for signing user JWTs
- Credentials issued by the Ermes core admin: `apiKey`, `apiSecret`, `tenantKey`, `applicationId`

## Installation

```bash
npm install @ottimis/ermes-node-sdk
# or
pnpm add @ottimis/ermes-node-sdk
```

---

## Quick start

End-to-end integration in 4 steps:

### 1. Generate an RSA key pair

```bash
openssl genrsa -out ermes-private.pem 2048
openssl rsa -in ermes-private.pem -pubout -out ermes-public.pem
```

Share `ermes-public.pem` (or your JWKS endpoint URL) with the Ermes core admin. Keep the private key in your backend — never expose it client-side.

### 2. Set environment variables

Create `.env` (do not commit):

```dotenv
NOTIFICATION_CORE_URL=https://ermes.yourcompany.com
NOTIFICATION_TENANT_KEY=myapp
NOTIFICATION_APPLICATION_ID=my-backoffice
NOTIFICATION_ISSUER=https://api.yourcompany.com
NOTIFICATION_API_KEY=ak_xxxxxxxxxxxxxxx
NOTIFICATION_API_SECRET=as_yyyyyyyyyyyyyyy
NOTIFICATION_RSA_PRIVATE_KEY_PATH=/run/secrets/ermes-private.pem
NOTIFICATION_KID=myapp-key-1
```

Alternative (inline key, suitable for Heroku/Vercel/Docker secrets without volume mount):

```dotenv
NOTIFICATION_RSA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

### 3. Instantiate the client (single shared instance)

```ts
import { NotificationClient, NotificationConfig } from '@ottimis/ermes-node-sdk';

export const ermes = new NotificationClient(NotificationConfig.fromEnv());
```

### 4. Expose JWKS + send your first event

```ts
// HTTP route: GET /.well-known/jwks.json
app.get('/.well-known/jwks.json', (_req, res) => res.json(ermes.getJwks()));

// Send an event
await ermes.sendEvent({
  topic:           'contract.termination.completed',
  title:           'Cessazione completata',
  body:            'Contratto C-1234 elaborato.',
  severity:        'success',
  entity_type:     'contract',
  entity_id:       'C-1234',
  recipient_users: ['user_42'],
});
```

That's it. Frontend connects via Socket.IO using a token from `client.createUserToken(userId)` — see [User tokens](#user-tokens-socketio--inbox).

---

## Configuration

### Option A — explicit (recommended for multi-project setups)

```ts
import { NotificationClient, NotificationConfig } from '@ottimis/ermes-node-sdk';
import * as fs from 'fs';

const config = new NotificationConfig({
  coreUrl:       'https://ermes.yourcompany.com',
  tenantKey:     'myapp',
  applicationId: 'my-backoffice',
  issuer:        'https://auth.yourcompany.com',
  apiKey:        'ak_xxxxxxxxxxxxxxx',
  apiSecret:     'as_yyyyyyyyyyyyyyy',
  privateKeyPem: fs.readFileSync('/path/to/private.pem', 'utf8'),
  kid:           'myapp-key-1',
});

const client = new NotificationClient(config);
```

### Option B — from environment variables

```ts
const client = new NotificationClient(NotificationConfig.fromEnv());
```

| Env var | Required | Description |
|---|---|---|
| `NOTIFICATION_CORE_URL` | yes | Base URL of the Ermes core server |
| `NOTIFICATION_TENANT_KEY` | yes | Logical tenant identifier |
| `NOTIFICATION_APPLICATION_ID` | yes | Producer application identifier |
| `NOTIFICATION_ISSUER` | yes | `iss` claim in user JWTs |
| `NOTIFICATION_API_KEY` | yes | Basic auth key for event ingestion |
| `NOTIFICATION_API_SECRET` | yes | Basic auth secret for event ingestion |
| `NOTIFICATION_RSA_PRIVATE_KEY` | yes* | RSA private key PEM (inline, `\n` escaped) |
| `NOTIFICATION_RSA_PRIVATE_KEY_PATH` | yes* | Path to RSA private key PEM file |
| `NOTIFICATION_KID` | no | Key ID for JWKS (default: `key-1`) |

*Either `NOTIFICATION_RSA_PRIVATE_KEY` or `NOTIFICATION_RSA_PRIVATE_KEY_PATH` is required.

Missing or invalid configuration throws `ErmesConfigurationError`.

---

## JWKS endpoint

Your backend must expose `/.well-known/jwks.json` so the Ermes core can validate user JWTs:

```ts
// in your HTTP handler (Express / Nest / Fastify):
const jwks = client.getJwks();
res.json(jwks);
```

Returns a strongly-typed `JwksDocument`.

---

## Sending events

```ts
import type { EventInput, SendEventResult } from '@ottimis/ermes-node-sdk';

const event: EventInput = {
  topic:           'contract.termination.completed',
  title:           'Cessazione completata',
  body:            'La cessazione del contratto C-1234 è stata elaborata.',
  severity:        'info',
  entity_type:     'contract',
  entity_id:       'C-1234',
  recipient_users: ['user_42'],
  payload:         { contract_id: 'C-1234' },
  event_name:      'notification.new', // optional — defaults to 'notification.new'
};

const result: SendEventResult = await client.sendEvent(event);
// result.eventId — generated `evt-...` id
// result.body    — decoded response body (unknown)
```

`tenant_key`, `application_id`, and `event_id` are injected automatically. If `event_name` is omitted it defaults to `'notification.new'` — the event name the official Ermes FE client subscribes to. Override only if you know the consumer listens to a different name. Any non-202 response throws a typed error (see [Error handling](#error-handling)).

### EventInput fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `topic` | `string` | yes | Hierarchical dot-path identifier (e.g. `contract.termination.completed`). Used for filtering and routing. |
| `title` | `string` | yes | Human-readable title (or i18n key). |
| `body` | `string` | no | Human-readable body (or i18n key). |
| `severity` | `'info' \| 'warning' \| 'error' \| 'success'` | no | Defaults to `'info'` on the BE side. |
| `entity_type` | `string` | no | Domain entity type the notification refers to. |
| `entity_id` | `string` | no | Domain entity id. |
| `recipient_users` | `string[]` | yes | User ids to deliver to. |
| `payload` | `Record<string, unknown>` | no | Arbitrary structured data forwarded to the FE. |
| `event_name` | `string` | no | Defaults to `'notification.new'`. Name the WS client subscribes to. |

---

## User tokens (Socket.IO + inbox)

```ts
// Short form — token string only
const token = client.createUserToken('user_42');

// Full form — token + claims
const { token, info } = client.createUserTokenWithInfo('user_42');
// info.exp — Unix timestamp; current TTL is 9 years (parity with PHP SDK)

// Custom roles (default: ['operator'])
const adminToken = client.createUserToken('user_42', ['operator', 'admin']);
```

Frontend Socket.IO connection:

```ts
import { io } from 'socket.io-client';

const socket = io('wss://ermes.yourcompany.com', {
  auth: { token },
});

socket.on('notification.new', (notification) => {
  // notification.title, notification.body, notification.payload, ...
});
```

The FE client subscribes to `notification.new` — this is why `event_name` defaults to that value when sending. Mint the token server-side via `createUserToken(userId)` and ship it to the browser through your existing auth flow; never expose `apiKey`/`apiSecret`/`privateKeyPem` to the client.

---

## Inbox proxy methods

All inbox methods return their response body directly on success and throw a typed error on any non-2xx status.

### List notifications

```ts
const list = await client.getNotifications('user_42', {
  status: 'unread',
  page:   1,
  limit:  20,
  topic:  'contract.termination.completed',
});
// list.items       — InboxItem[]
// list.pagination  — { page, limit, total, nextCursor }
```

### Unread count

```ts
const { count } = await client.getUnreadCount('user_42');
```

### Sync (cursor-based)

```ts
const sync = await client.syncNotifications('user_42', { after: 'notif_1250', limit: 50 });
// sync.items  — InboxItem[]
// sync.cursor — string | null
```

### Mark as read

```ts
await client.markAsRead('1b2c3d4e-5f60-4718-9abc-def012345678', 'user_42');

await client.markBulkRead(
  ['1b2c3d4e-5f60-4718-9abc-def012345678', '2c3d4e5f-6071-4829-abcd-ef0123456789'],
  'user_42',
);

await client.markAllAsRead('user_42');
```

All mark methods return `Promise<void>` on 200/204 and throw on any other status.

---

## Error handling

All SDK methods follow Spring Boot–style typed exceptions. On any failure the SDK throws a subclass of `ErmesError`. Inspect with `instanceof` and switch on the class — never on string messages.

### Hierarchy

```
Error
└── ErmesError                          // abstract base, all SDK errors extend this
    ├── ErmesHttpError                  // abstract, every HTTP non-2xx
    │   ├── ErmesBadRequestError        // 400
    │   ├── ErmesUnauthorizedError      // 401
    │   ├── ErmesForbiddenError         // 403
    │   ├── ErmesNotFoundError          // 404
    │   ├── ErmesConflictError          // 409
    │   ├── ErmesValidationError        // 422
    │   ├── ErmesRateLimitError         // 429 (+ retryAfterSeconds)
    │   ├── ErmesInternalServerError    // 500
    │   ├── ErmesBadGatewayError        // 502
    │   ├── ErmesServiceUnavailableError// 503
    │   ├── ErmesGatewayTimeoutError    // 504
    │   └── ErmesUnexpectedStatusError  // fallback for unmapped statuses
    ├── ErmesNetworkError               // DNS, connection refused, socket errors
    │   └── ErmesTimeoutError           // request aborted by timeout
    ├── ErmesConfigurationError         // invalid config / missing env vars / non-RSA key
    └── ErmesParseError                 // server returned non-JSON body when JSON was required
```

Every `ErmesError` exposes:
- `name` — class name (`"ErmesNotFoundError"`)
- `code` — stable machine-readable code (`"ERMES_NOT_FOUND"`)
- `message` — human-readable diagnostic
- `cause` — original underlying error if any (e.g. wrapped axios error)

Every `ErmesHttpError` adds:
- `status` — HTTP status code
- `responseBody` — parsed JSON body, or `null` if non-JSON
- `requestUrl` — full request URL
- `requestMethod` — `'GET'` or `'POST'`

`ErmesRateLimitError` additionally exposes `retryAfterSeconds` (parsed from `Retry-After`).

### Status → class mapping

| HTTP status | Error class                      | Code                      |
|---|---|---|
| 400 | `ErmesBadRequestError`            | `ERMES_BAD_REQUEST`       |
| 401 | `ErmesUnauthorizedError`          | `ERMES_UNAUTHORIZED`      |
| 403 | `ErmesForbiddenError`             | `ERMES_FORBIDDEN`         |
| 404 | `ErmesNotFoundError`              | `ERMES_NOT_FOUND`         |
| 409 | `ErmesConflictError`              | `ERMES_CONFLICT`          |
| 422 | `ErmesValidationError`            | `ERMES_VALIDATION`        |
| 429 | `ErmesRateLimitError`             | `ERMES_RATE_LIMIT`        |
| 500 | `ErmesInternalServerError`        | `ERMES_INTERNAL`          |
| 502 | `ErmesBadGatewayError`            | `ERMES_BAD_GATEWAY`       |
| 503 | `ErmesServiceUnavailableError`    | `ERMES_UNAVAILABLE`       |
| 504 | `ErmesGatewayTimeoutError`        | `ERMES_GATEWAY_TIMEOUT`   |
| other | `ErmesUnexpectedStatusError`    | `ERMES_UNEXPECTED_STATUS` |

### Example

```ts
import {
  ErmesHttpError,
  ErmesUnauthorizedError,
  ErmesValidationError,
  ErmesRateLimitError,
  ErmesNetworkError,
  ErmesTimeoutError,
} from '@ottimis/ermes-node-sdk';

try {
  const inbox = await client.getNotifications('user_42');
  return inbox.items;
} catch (err) {
  if (err instanceof ErmesUnauthorizedError) {
    // re-auth flow
    throw err;
  }
  if (err instanceof ErmesValidationError) {
    // err.responseBody contains the server's validation payload
    logger.warn({ body: err.responseBody }, 'validation failed');
    throw err;
  }
  if (err instanceof ErmesRateLimitError) {
    await sleep((err.retryAfterSeconds ?? 1) * 1000);
    // retry...
  }
  if (err instanceof ErmesTimeoutError) {
    // request timed out before any response
  } else if (err instanceof ErmesNetworkError) {
    // DNS / TCP / TLS failure
  } else if (err instanceof ErmesHttpError) {
    // any other HTTP failure — err.status, err.responseBody available
  }
  throw err;
}
```

### NestJS / Express integration

Both NestJS exception filters and Express error middlewares can pattern-match on these classes the same way you would on `HttpException` subclasses — e.g. map `ErmesUnauthorizedError → 401`, `ErmesValidationError → 422`, anything else → 502.

---

## Type exports

All public types and error classes are exported from the package entry point:

```ts
import {
  // client
  NotificationClient, NotificationConfig,
  // errors (classes — runtime values)
  ErmesError, ErmesHttpError,
  ErmesBadRequestError, ErmesUnauthorizedError, ErmesForbiddenError,
  ErmesNotFoundError, ErmesConflictError, ErmesValidationError, ErmesRateLimitError,
  ErmesInternalServerError, ErmesBadGatewayError, ErmesServiceUnavailableError,
  ErmesGatewayTimeoutError, ErmesUnexpectedStatusError,
  ErmesNetworkError, ErmesTimeoutError,
  ErmesConfigurationError, ErmesParseError,
  mapHttpError,
} from '@ottimis/ermes-node-sdk';

import type {
  // config
  NotificationConfigOptions,
  // events
  EventInput, EventSeverity, SendEventResult,
  // inbox
  InboxItem, Pagination, ListParams, InboxListResponse,
  SyncParams, SyncResponse, UnreadCountResponse,
  // jwt / jwks
  JwtClaims, TokenWithInfo, JwksKey, JwksDocument,
  // http
  HttpResponseRaw,
  // error option shapes
  ErmesErrorOptions, ErmesHttpErrorOptions, ErmesHttpMethod,
  ErmesRateLimitErrorOptions, ErmesParseErrorOptions, MapHttpErrorArgs,
} from '@ottimis/ermes-node-sdk';
```