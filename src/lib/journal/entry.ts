import type { DomainEvent } from '../domain/events';

export type JournalEntry = DomainEvent & { readonly seq: number };

export type JournalStats = {
  limit: number;
  size: number;
  dropped: number;
  lastSeq: number;
  unpersisted: number;
};
