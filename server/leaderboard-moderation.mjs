// Owner-requested removal of one confirmed record. This is not a nickname ban.
// The store archives the entry before removing its derived leaderboard row;
// original completed sessions remain available for an authorized restoration.
export const LEADERBOARD_REMOVALS = Object.freeze([
  Object.freeze({
    scope: 'public',
    rulesVersion: 'challenge-v22',
    runId: '9ac0217a-0aab-4190-ae49-c96324478131',
    name: '해커',
    reason: 'Owner-requested removal of manipulated record',
  }),
]);

export function excludedRunIdsFor({scope, rulesVersion} = {}) {
  return LEADERBOARD_REMOVALS.filter(row => row.scope === scope && row.rulesVersion === rulesVersion).map(row => row.runId);
}

export function isExcludedRun({scope, rulesVersion, runId} = {}) {
  return LEADERBOARD_REMOVALS.some(row => row.scope === scope && row.rulesVersion === rulesVersion && row.runId === runId);
}
