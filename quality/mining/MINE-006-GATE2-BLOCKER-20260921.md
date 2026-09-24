# MINE-006 Gate 2 blocker evidence — 2026-09-21

Status: `BLOCKED / NOT CLOSED`

## Canonical Gate 2

Required fresh-checkout command chain:

```text
npm ci
node quality/mining/phase06_ops_console_assertions.mjs
npm run typecheck
npm run lint
npm run build
echo PHASE06_VERIFY_OK
```

A valid `PHASE06_VERIFY_OK` exists only when every preceding command ran successfully in a fresh checkout of the current Ops branch.

## Current GitHub Actions blocker

- Phase06 application source authority: `87b2c2145bda14bf4cc3c7968a0bc205cacb877d`
- closure/docs branch HEAD before this evidence file: `1af7f0033d1b77da7ed1f3439fd5a2489e27ea83`
- run `35530390739`: zero-step failure; rerun also zero-step failure
- run `35536471261`: zero-step failure; job `steps=null`
- no `npm ci`, assertion, typecheck, lint, or build step started
- workflow returned to `workflow_dispatch` only at `88095d8968e1b0c2acd5541f46c1da6030d7565b`

These failures are infrastructure/quota failures, not source failures, and are not PASS evidence.

## Alternative fresh-runner attempts

Render alternatives were tested without touching production:

- direct private `putduk-ops` clone: authentication unavailable
- reuse Render checkout origin credential: unavailable during build
- HTTPS clone: private-repo authentication unavailable
- SSH/submodule: no reusable deploy key / public key auth unavailable
- Vercel: no `putduk-ops` Git project connected
- GitHub Codespaces through browser automation: private repo returned 404 because the browser context had no saved GitHub authentication, so no Codespace or terminal could be opened

Therefore no alternative runner currently has both a clean execution environment and read access to the private Ops repository.

## Invalid marker quarantine

One Render probe used shell `set -u` without fail-fast `set -e`, continued after clone/submodule errors, and printed `PHASE06_VERIFY_OK`.

That marker is permanently invalid and must never be used as Gate 2 PASS evidence.

The only live misleading probe endpoint was retired and externally verified to return HTTP `410` instead of the invalid marker.

## Temporary-resource cleanup

- `temp/phase06-ops-fresh-verify-20260921` was reset to clean backend HEAD `d6e279841aaa62b7b75f26a7b33d1768923d551b` after probe retirement.
- `temp/phase06-ops-snapshot-20260921` was reset to the same clean backend HEAD.
- Render Phase06 Ops gate services have `autoDeploy=no`; failed gate services have no successful runtime deployment.
- `putduk-phase06-submodule-probe` was explicitly retired and externally verified as HTTP 410.
- temporary E2E runner admin/JWT environment values were overwritten with empty values after Gate 1 evidence was secured.
- staging backend `putduk-mine-api-staging` was not modified by this cleanup.
- production was not modified.

## Existing valid evidence

Gate 1 is PASS via real staging maker/checker E2E and marker:

```text
PHASE06_STAGING_E2E_PASS
```

Current-source direct contract audit and historical fresh checkout/build evidence exist as supporting evidence, but neither is promoted to canonical Gate 2 PASS.

## Closure rule

`MINE-006` remains `BLOCKED / NOT CLOSED` until a fresh checkout executes the canonical Gate 2 chain successfully and emits a legitimate `PHASE06_VERIFY_OK`.

PHASE07 must not begin before that condition is met unless the gate is explicitly waived by project authority.
