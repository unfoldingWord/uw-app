import type { FailureCode } from '../../domain/failures';

export const failures = {
  'failure.http.offline': 'You are offline. Try again when you are connected.',
  'failure.http.timeout': 'The library took too long to answer. Try again in a moment.',
  'failure.http.status': 'The library did not answer as expected. Try again later.',
  'failure.http.host-refused': 'The app only connects to the places it knows.',
  'failure.http.cancelled': 'This stopped before it finished. You can try again.',
  'failure.files.not-found': 'That file is no longer on this phone.',
  'failure.files.no-space': 'This phone is out of space. Remove a pack, then try again.',
  'failure.files.io': 'The phone could not save this. Try again.',
  'failure.db.migration-failed':
    'The app could not bring its records up to date. Share diagnostics so someone can help.',
  'failure.db.io': 'The app could not read its records. Try again.',
  'failure.kv.io': 'This setting could not be saved. Try again.',
  'failure.journal.persist-failed': 'The diagnostics record could not be kept. Everything else still works.',
  'failure.journal.event-rejected': 'One diagnostics entry was left out. Everything else still works.',
  'failure.journal.import-invalid': 'This is not a diagnostics file the app can read.',
  'failure.kernel.not-owned':
    'The app held back a change it is not meant to make. Share diagnostics so someone can help.',
  'failure.kernel.observer-failed':
    'Part of the app did not finish updating. Share diagnostics so someone can help.',
  'failure.catalog.invalid-response':
    'The library list came back in a form the app cannot read. Try again later.',
  'failure.pack.not-found': 'This resource is no longer published. Check for updates later.',
  'failure.pack.no-space': 'There is not enough space for this pack. Remove another pack, then try again.',
  'failure.pack.checksum-mismatch': 'The download did not arrive whole. Try again.',
  'failure.pack.invalid-burrito': 'This file is not a resource the app can read.',
  'failure.pack.unknown-flavor': 'This resource is a kind the app cannot open yet.',
  'failure.pack.no-provenance': 'This resource does not say who published it, so the app keeps it out.',
  'failure.pack.empty-plan': 'Choose at least one resource first.',
  'failure.pack.mixed-packs': 'These resources belong to different packs. Send one pack at a time.',
  'failure.corpus.unreadable': 'This pack could not be opened. Remove it, then download it again.',
  'failure.transfer.unavailable': 'Nearby transfer is not available on this phone right now.',
  'failure.transfer.unsupported': 'This phone cannot send the app itself. Resources can still go.',
  'failure.transfer.declined': 'The other phone did not accept. You can offer again.',
  'failure.transfer.peer-lost': 'The other phone moved out of reach. Bring the phones closer and try again.',
  'failure.transfer.cancelled': 'The transfer was stopped. Nothing partial was kept.',
  'failure.audio.unavailable': 'Audio is not available for this right now.',
  'failure.share.unavailable': 'Sharing is not available on this phone right now.',
  'failure.partners.invalid-feed':
    'The impact stories came back in a form the app cannot read. The ones on this phone still show.',
  'failure.unexpected': 'Something did not work. Try again, or share diagnostics so someone can help.',
} as const satisfies Record<`failure.${FailureCode}`, string>;
