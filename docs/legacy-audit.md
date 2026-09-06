# Legacy audit and cleanup plan

## Status

This document is the first non-breaking step in the cleanup of legacy and dead code.

## Confirmed dead / unused candidates

### 1. `api/contact.js`

Why it is a dead candidate:
- the frontend contact flow does not submit to `/api/contact`;
- the actual UI uses `mailto:` links via `sendMessage()` in `script.js`;
- the file imports `nodemailer`, but the project dependencies do not include it.

Action:
- mark as deprecated;
- keep for now until the contact flow is migrated or removed;
- remove after final verification.

### 2. `api/proxy.js`

Why it is a dead candidate:
- no references were found in the frontend or other server files;
- it looks like a generic, abandoned proxy-style endpoint that is not wired into the product flow.

Action:
- mark as deprecated;
- remove after confirming no external caller depends on it.

## Strong legacy risk

### 3. `config.js`

Why it is risky:
- the browser loads API keys from `localStorage` and `config.env`;
- the code simulates a server-side config fallback with a placeholder value (`server-side-key`);
- this is not a secure configuration model and should be moved server-side.

Action:
- keep only as temporary compatibility layer;
- move key resolution to serverless API or environment configuration;
- remove client-side key loading from the browser.

### 4. `script.js`

Why it is risky:
- it contains routing, UI rendering, sidebar logic, analytics, modal flow, testing, and API calls in one giant file;
- this is a classic monolith and a hard object for maintenance and regression testing.

Action:
- split into app/state/service/features modules in the next steps;
- keep the public behavior stable while extracting modules.

## Planned refactor stages

1. Freeze current behavior with a smoke test.
2. Mark unused legacy endpoints as deprecated.
3. Remove insecure browser-side config logic from runtime path.
4. Extract `script.js` into domain modules.
5. Remove dead endpoints after external usage check.
6. Add regression checks for the main user journeys.

## Notes

This is intentionally a safe incremental cleanup. The goal is to remove risk without breaking the application flow.
