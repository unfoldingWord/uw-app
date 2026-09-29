import { pendingCheck } from './check.ts';

export default pendingCheck(
  'network',
  'No production dependency opens a socket itself; only the Http port reaches the network, to allowlisted hosts',
  'T9 (src/platform/http.ts and its allowlist)',
);
