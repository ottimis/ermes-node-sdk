import type { EventSeverity } from './events';

export interface InboxItem {
  notification_uuid: string;
  topic: string;
  title: string;
  body: string | null;
  severity: EventSeverity | null;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  nextCursor: string | null;
}

/** Visibilità delle notifiche cancellate (soft-delete). Default backend: 'exclude'. */
export type DeletedFilter = 'exclude' | 'only' | 'all';

export interface ListParams {
  status?: 'unread' | 'all';
  page?: number;
  limit?: number;
  topic?: string;
  /** ISO 8601 — solo notifiche con created_at >= valore (inclusivo). */
  created_after?: string;
  /** ISO 8601 — solo notifiche con created_at <= valore (inclusivo). */
  created_before?: string;
  /** Visibilità cancellate. Assente => backend usa 'exclude' (retrocompatibile). */
  deleted?: DeletedFilter;
}

export interface InboxListResponse {
  items: InboxItem[];
  pagination: Pagination;
}

export interface SyncParams {
  after?: string;
  limit?: number;
  /** ISO 8601 — solo notifiche con created_at >= valore (inclusivo). */
  created_after?: string;
  /** ISO 8601 — solo notifiche con created_at <= valore (inclusivo). */
  created_before?: string;
  /** Visibilità cancellate. Assente => backend usa 'exclude' (retrocompatibile). */
  deleted?: DeletedFilter;
}

export interface SyncResponse {
  items: InboxItem[];
  cursor: string | null;
}

export interface UnreadCountResponse {
  count: number;
}
