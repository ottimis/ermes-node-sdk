export type EventSeverity = 'info' | 'warning' | 'error' | 'success';

export interface EventInput {
  topic: string;
  title: string;
  body?: string;
  severity?: EventSeverity;
  entity_type?: string;
  entity_id?: string;
  recipient_users: string[];
  payload?: Record<string, unknown>;
  /** Defaults to 'notification.new' if omitted. */
  event_name?: string;
}

export interface SendEventResult {
  eventId: string;
  body: unknown;
}
