import { describe, expect, it } from 'vitest';
import {
  bookmarkTargets,
  checkEvent,
  eventSchemas,
  inputOf,
  movements,
  replayClasses,
  replayClassOf,
  searchKinds,
  shareKinds,
  tracks,
  type EventType,
} from './events';
import { fieldValidators } from './fields';

const typedByALeader = ['Jesse Griffin', 'Our group at the church', 'What does grace mean?', 'éé'];

describe('events (DX-1 nothing identifies the leader)', () => {
  it('accepts a well-formed event', () => {
    expect(checkEvent({ type: 'AppOpened', at: 1, payload: { day: '2026-01-05' } }).ok).toBe(true);
    expect(
      checkEvent({
        type: 'Failure',
        at: 2,
        payload: { code: 'http.timeout', context: { host: 'git.door43.org', attempt: 2, online: true } },
      }).ok,
    ).toBe(true);
    expect(
      checkEvent({
        type: 'BookmarkAdded',
        at: 3,
        payload: { bookmark: 'id-1', target: 'passage', reference: 'JHN 3:16' },
      }).ok,
    ).toBe(true);
  });

  it('refuses unknown types, extra fields, missing fields and bad times', () => {
    expect(checkEvent({ type: 'LeaderNamed', at: 1, payload: {} })).toEqual({
      ok: false,
      reason: 'unknown event type LeaderNamed',
    });
    expect(checkEvent({ type: 'GroupCreated', at: 1, payload: { group: 'id-1', name: 'Grace' } }).ok).toBe(
      false,
    );
    expect(checkEvent({ type: 'GroupCreated', at: 1, payload: {} }).ok).toBe(false);
    expect(checkEvent({ type: 'AppOpened', at: -1, payload: { day: '2026-01-05' } }).ok).toBe(false);
    expect(checkEvent({ type: 'AppOpened', at: 1.5, payload: { day: '2026-01-05' } }).ok).toBe(false);
    expect(
      checkEvent({ type: 'PassageOpened', at: 1, payload: { reference: 'John 3:16', language: 'en' } }).ok,
    ).toBe(false);
    expect(
      checkEvent({ type: 'SearchRun', at: 1, payload: { kind: 'query', language: 'en', hits: 1 } }).ok,
    ).toBe(false);
  });

  it('has no field of any event that holds text a leader typed', () => {
    for (const validate of Object.values(fieldValidators)) {
      for (const text of typedByALeader) {
        expect(validate(text)).toBe(false);
      }
    }
    for (const type of Object.keys(eventSchemas) as EventType[]) {
      const specs: Readonly<Record<string, unknown>> = eventSchemas[type].payload;
      for (const spec of Object.values(specs)) {
        if (typeof spec === 'string') {
          expect(Object.keys(fieldValidators)).toContain(spec.replace(/\?$/, ''));
        } else {
          for (const text of typedByALeader) {
            expect(spec).not.toContain(text);
          }
        }
      }
    }
    expect(
      checkEvent({
        type: 'Failure',
        at: 1,
        payload: { code: 'unexpected', context: { message: 'Could not save group Grace Fellowship' } },
      }).ok,
    ).toBe(false);
  });

  it('classifies every event for replay and keeps the architecture names', () => {
    const named = [
      'PackInstallStarted',
      'PackInstalled',
      'PackFailed',
      'PackRemoved',
      'CatalogRefreshed',
      'PassageOpened',
      'ArticleOpened',
      'StoryOpened',
      'SearchRun',
      'GroupCreated',
      'SessionStarted',
      'StepCompleted',
      'SessionCompleted',
      'TransferOffered',
      'TransferAccepted',
      'TransferProgressed',
      'TransferCompleted',
      'TransferFailed',
      'ShareSent',
      'ImportReceived',
      'InvitationShown',
      'InvitationTapped',
      'Failure',
    ];
    expect(Object.keys(eventSchemas)).toEqual(expect.arrayContaining(named));
    for (const type of Object.keys(eventSchemas) as EventType[]) {
      expect(replayClasses).toContain(replayClassOf(type));
    }
    expect(replayClassOf('Failure')).toBe('follows');
    expect(replayClassOf('AppOpened')).toBe('redo');
  });

  it('closes the enumerations that events carry', () => {
    expect(tracks).toEqual(['foundations', 'training', 'topics']);
    expect(movements.slice(0, 5)).toEqual([
      'observation',
      'translation',
      'discourse',
      'theological',
      'journal',
    ]);
    expect(searchKinds).toContain('fulltext');
    expect(shareKinds).toContain('journal');
    expect(bookmarkTargets).toEqual(['passage', 'article', 'story']);
  });

  it('turns a recorded event back into the input that produced it', () => {
    expect(inputOf({ type: 'PackRemoved', at: 9, payload: { pack: 'language:qaa' } })).toEqual({
      type: 'PackRemoved',
      payload: { pack: 'language:qaa' },
    });
  });
});
