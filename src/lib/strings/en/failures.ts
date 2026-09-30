import type { FailureCode } from '../../domain/failures';

export const failures = {
  'failure.http.offline': 'You are offline, so try again when you are connected.',
  'failure.http.timeout': 'The catalog took too long to answer, so try again in a moment.',
  'failure.http.status': 'The catalog did not answer as expected, so try again later.',
  'failure.http.host-refused': 'The app only connects to the places it knows.',
  'failure.http.cancelled': 'This stopped before it finished, and you can try again.',
  'failure.files.not-found': 'That file is no longer on this phone.',
  'failure.files.no-space': 'This phone is out of space, so remove a pack and then try again.',
  'failure.files.io': 'The phone could not save this, so try again.',
  'failure.db.migration-failed':
    'The app could not bring its records up to date, so share diagnostics for someone to help.',
  'failure.db.io': 'The app could not read or save its records, so try again.',
  'failure.kv.io': 'This preference could not be saved, so try again.',
  'failure.journal.persist-failed':
    'The diagnostics record could not be kept, but everything else still works.',
  'failure.journal.event-rejected': 'One diagnostics entry was left out, but everything else still works.',
  'failure.journal.import-invalid': 'This is not a diagnostics file the app can read.',
  'failure.kernel.not-owned':
    'The app held back a change it is not meant to make, so share diagnostics for someone to help.',
  'failure.kernel.observer-failed':
    'Part of the app did not finish updating, so share diagnostics for someone to help.',
  'failure.catalog.invalid-response':
    'The catalog came back in a form the app cannot read, so try again later.',
  'failure.pack.not-found': 'This resource is no longer published, so check for updates later.',
  'failure.pack.no-space':
    'There is not enough space for this pack, so remove another pack and then try again.',
  'failure.pack.checksum-mismatch': 'The pack did not arrive whole, so try again.',
  'failure.pack.invalid-burrito': 'This file is not a resource the app can read.',
  'failure.pack.unknown-flavor': 'This resource is a kind the app cannot open yet.',
  'failure.pack.no-provenance': 'This resource does not say who published it, so the app keeps it out.',
  'failure.pack.empty-plan': 'Choose at least one resource first.',
  'failure.pack.mixed-packs': 'These resources belong to different packs, so send one pack at a time.',
  'failure.pack.replace-unconfirmed':
    'This would replace a resource you downloaded from the catalog, so nothing was installed.',
  'failure.corpus.unreadable': 'This pack could not be opened, so remove it and then download it again.',
  'failure.transfer.unavailable': 'Nearby transfer is not available on this phone right now.',
  'failure.transfer.unsupported': 'This phone cannot send the app itself, but resources can still go.',
  'failure.transfer.declined': 'The other phone did not accept, and you can offer again.',
  'failure.transfer.peer-lost':
    'The other phone moved out of reach, so bring the phones closer and try again.',
  'failure.transfer.cancelled': 'The transfer was stopped, and nothing partial was kept.',
  'failure.audio.unavailable': 'Audio is not available for this right now.',
  'failure.share.unavailable': 'Sharing is not available on this phone right now.',
  'failure.partners.invalid-feed':
    'The impact stories came back in a form the app cannot read, but the ones on this phone still show.',
  'failure.unexpected': 'Something did not work, so try again or share diagnostics for someone to help.',
} as const satisfies Record<`failure.${FailureCode}`, string>;
