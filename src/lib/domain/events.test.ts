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
        payload: { code: 'http.timeout', context: { step: 'catalog', page: 2, pack: 'language:qaa' } },
      }).ok,
    ).toBe(true);
    expect(
      checkEvent({
        type: 'BookmarkAdded',
        at: 3,
        payload: { bookmark: 'id-000001', target: 'passage', reference: 'JHN 3:16', language: 'qaa' },
      }).ok,
    ).toBe(true);
  });

  it('refuses unknown types, extra fields, missing fields and bad times', () => {
    expect(checkEvent({ type: 'LeaderNamed', at: 1, payload: {} })).toEqual({
      ok: false,
      reason: 'unknown event type LeaderNamed',
    });
    expect(
      checkEvent({ type: 'GroupCreated', at: 1, payload: { group: 'id-000001', name: 'Grace' } }).ok,
    ).toBe(false);
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
    const scalarSpecs = (Object.keys(eventSchemas) as EventType[]).flatMap((type) =>
      Object.values(eventSchemas[type].payload as Readonly<Record<string, unknown>>).flatMap((spec) =>
        typeof spec === 'object' && spec !== null && 'list' in spec
          ? Object.values(spec.list as Readonly<Record<string, unknown>>)
          : typeof spec === 'object' && spec !== null && 'optional' in spec
            ? [spec.optional]
            : [spec],
      ),
    );
    for (const spec of scalarSpecs) {
      if (typeof spec === 'string') {
        expect(Object.keys(fieldValidators)).toContain(spec.replace(/\?$/, ''));
      } else {
        for (const text of typedByALeader) {
          expect(spec).not.toContain(text);
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

  it('keeps names out of preferences, failure contexts and ids (DX-1)', () => {
    const accepted = (value: unknown) => checkEvent(value).ok;
    expect(accepted({ type: 'PreferenceChanged', at: 1, payload: { key: 'home.name' } })).toBe(true);
    expect(
      accepted({ type: 'PreferenceChanged', at: 1, payload: { key: 'home.name', value: 'Jesse' } }),
    ).toBe(false);
    expect(
      accepted({ type: 'PreferenceChanged', at: 1, payload: { key: 'home.theme', value: 'dark' } }),
    ).toBe(true);
    expect(
      accepted({ type: 'PreferenceChanged', at: 1, payload: { key: 'home.theme', value: 'Jesse' } }),
    ).toBe(false);
    expect(accepted({ type: 'PreferenceChanged', at: 1, payload: { key: 'home.theme' } })).toBe(false);
    expect(accepted({ type: 'PreferenceChanged', at: 1, payload: { key: 'jesse.name', value: 'on' } })).toBe(
      false,
    );
    expect(
      accepted({ type: 'PreferenceChanged', at: 1, payload: { key: 'study.language', value: 'sw' } }),
    ).toBe(true);
    for (const context of [
      { leader: 'Jesse.Griffin' },
      { step: 'jesse' },
      { install: 'Jesse-Tuesday-Group' },
      { type: 'JesseGriffin' },
      { status: 1.5 },
      { online: true },
    ]) {
      expect(accepted({ type: 'Failure', at: 1, payload: { code: 'unexpected', context } })).toBe(false);
    }
    expect(
      accepted({
        type: 'Failure',
        at: 1,
        payload: { code: 'kernel.observer-failed', context: { observer: 'corpus', type: 'PackInstalled' } },
      }),
    ).toBe(true);
    expect(accepted({ type: 'GroupCreated', at: 1, payload: { group: 'Jesse-Tuesday-Group' } })).toBe(false);
    expect(accepted({ type: 'GroupCreated', at: 1, payload: { group: 'g-1' } })).toBe(false);
    expect(
      accepted({ type: 'GroupCreated', at: 1, payload: { group: '0f8e2a4c-2b1d-4e8f-9a6b-3c5d7e9f1a2b' } }),
    ).toBe(true);
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
      'MovementCompleted',
      'SessionCompleted',
      'TransferOffered',
      'TransferAccepted',
      'TransferProgressed',
      'TransferCompleted',
      'TransferFailed',
      'AppInstallerOpened',
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

  it('takes an optional literal only from its list (a Training position has no movement)', () => {
    const position = { group: 'id-000001', track: 'training', session: 2 };
    expect(checkEvent({ type: 'PositionChanged', at: 1, payload: position }).ok).toBe(true);
    expect(
      checkEvent({ type: 'PositionChanged', at: 1, payload: { ...position, movement: 'journal' } }).ok,
    ).toBe(true);
    expect(
      checkEvent({ type: 'PositionChanged', at: 1, payload: { ...position, movement: 'drafting' } }).ok,
    ).toBe(false);
    expect(
      checkEvent({ type: 'PositionChanged', at: 1, payload: { ...position, movement: 'Tuesday group' } }).ok,
    ).toBe(false);
  });

  it('checks every item of a list field against its record, and bounds the list', () => {
    const burrito = {
      root: 'packs/language/qaa/unfoldingWord/qaa_ult',
      row: 'text',
      publisher: 'unfoldingWord',
      resource: 'qaa_ult',
      language: 'qaa',
      tag: 'v1',
      commit: 'ca519c4d',
      bytes: 10,
    };
    const installed = (burritos: unknown) => ({
      type: 'PackInstalled',
      at: 1,
      payload: {
        install: 'id-000001',
        pack: 'language:qaa',
        kind: 'language',
        source: 'catalog',
        language: 'qaa',
        resources: 1,
        bytes: 10,
        burritos,
      },
    });
    expect(checkEvent(installed([burrito])).ok).toBe(true);
    expect(checkEvent(installed([])).ok).toBe(true);
    expect(checkEvent(installed([{ ...burrito, title: 'Fixture Literal Text' }])).ok).toBe(false);
    expect(checkEvent(installed([{ ...burrito, row: 'bundle' }])).ok).toBe(false);
    expect(checkEvent(installed(burrito)).ok).toBe(false);
    expect(checkEvent(installed(Array.from({ length: 65 }, () => burrito))).ok).toBe(false);
    expect(checkEvent(installed([burrito]).payload)).toMatchObject({ ok: false });
    const refused = checkEvent(installed(['qaa_ult']));
    expect(refused).toEqual({ ok: false, reason: 'PackInstalled.burritos is not a valid list' });
  });

  it('turns a recorded event back into the input that produced it', () => {
    expect(inputOf({ type: 'PackRemoved', at: 9, payload: { pack: 'language:qaa' } })).toEqual({
      type: 'PackRemoved',
      payload: { pack: 'language:qaa' },
    });
  });
});
