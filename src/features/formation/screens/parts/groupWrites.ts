import { useCallback, useState } from 'react';
import type { FailureCode } from '@lib/domain/failures';
import { sessionMovements } from '@lib/domain/events';
import type {
  FormationContent,
  FormationService,
  FoundationsSession,
  Group,
  SessionMovementId,
  Track,
  Written,
} from '../../service';
import { settle, type WriteResult } from './outcome';

export const sessionMovementIds: readonly SessionMovementId[] = sessionMovements;

export function shownFormation(session: FoundationsSession): FormationContent | undefined {
  if (session.movements.state === 'in-language') {
    return session.movements.formation;
  }
  return session.movements.english.state === 'shown' ? session.movements.english.formation : undefined;
}

export function atSession(group: Group | undefined, track: Track, number: number): boolean {
  return group !== undefined && group.position.track === track && group.position.session === number;
}

export function doneMovements(group: Group | undefined, number: number): ReadonlySet<SessionMovementId> {
  if (group === undefined || group.position.track !== 'foundations') {
    return new Set();
  }
  if (group.position.session > number) {
    return new Set(sessionMovementIds);
  }
  if (group.position.session < number) {
    return new Set();
  }
  const reached = sessionMovementIds.indexOf(group.position.movement ?? 'observation');
  return new Set(sessionMovementIds.slice(0, reached));
}

export async function placeGroup(
  service: FormationService,
  group: Group,
  track: Track,
  number: number,
  movement?: SessionMovementId,
): Promise<Written<Group> | undefined> {
  const here =
    atSession(group, track, number) && (movement === undefined || group.position.movement === movement);
  return here
    ? { ok: true, value: group }
    : service.advance(group.id, { track, session: number, ...(movement === undefined ? {} : { movement }) });
}

export type Run = (work: () => Promise<WriteResult>) => Promise<WriteResult | undefined>;

export function useFailure(): [FailureCode | undefined, Run] {
  const [failure, setFailure] = useState<FailureCode | undefined>(undefined);
  const run = useCallback<Run>(async (work) => {
    let result: WriteResult | undefined;
    setFailure(
      await settle(async () => {
        result = await work();
        return result;
      }),
    );
    return result;
  }, []);
  return [failure, run];
}
