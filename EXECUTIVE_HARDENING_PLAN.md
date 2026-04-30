# Executive Hardening Plan

## Objectives
- Primary goal: make Sage credible for a CEO-style productivity workflow.
- Secondary goal: keep the hackathon demo stable even if live integrations or quota fail.

## Working Assumptions
- `DEMO_MODE` is the default for hackathon and demo deploys.
- Current screen IA stays: `Today`, `Week Planner`, `Meeting Brief`, `Debrief`, `Insights`, `Tasks`.
- Status vocabulary for this tracker is only: `Not started`, `In progress`, `Blocked`, `Done`.

## Epics
- Workflow continuity: `In progress`
- Demo-mode data and fallback behavior: `In progress`
- Reliability and error handling: `In progress`
- Executive output quality: `In progress`
- Enterprise hardening basics: `In progress`

## Dependencies
- Gemini quota and billing availability: `Blocked`
- OAuth token validity for Workspace APIs: `In progress`
- SQLite or persistent storage choice for meeting memory: `Done`
- Cloud Run deployment and secret mount stability: `In progress`

## Acceptance Criteria
### Wave 1
- A judge can run the full demo with no dependency on live Gmail, Drive, or Docs: `Done`
- `Apex Client Call`, `Product Review`, and one debrief flow always return stable outputs: `Done`
- No raw backend exception is visible in UI: `Done`

### Wave 2
- Opening a meeting twice shows continuity instead of a fresh blank state: `Done`
- Debrief reflects the selected meeting rather than generic sample behavior: `Done`
- Chat suggestions differ based on active meeting context: `Done`

### Wave 3
- Morning brief reads like a chief-of-staff summary: `Done`
- Meeting brief highlights decisions, risks, and follow-ups: `Done`
- Partial outages degrade to cached, mock, or partial states without breaking the flow: `Done`

## Definition Of Done
### Epic DoD
- Workflow continuity: meeting brief, notes draft, debrief, and actions reopen from persisted state.
- Demo mode: seeded meetings, notes, and executive outputs cover the hackathon script without live dependencies.
- Reliability: routes return structured errors and carry request ids for traceability.
- Executive output quality: `Today`, `Meeting Brief`, `Debrief`, and `Insights` all emphasize decisions, risks, owners, and follow-through.
- Enterprise baseline: production deploy uses Secret Manager-backed secrets and persistent meeting state.

### Global DoD
- Demo-mode deploy succeeds: `Done`
- Three scripted meetings work end to end: `Done`
- Frontend and backend build validation pass: `Done`
- Tracker includes validation evidence and remaining blockers: `Done`

## Execution Checklist
### Wave 1
- [x] Add repo-owned tracker document.
- [x] Add backend `DEMO_MODE` and `DEMO_USE_LIVE_ENRICHMENT` config.
- [x] Add frontend demo-mode awareness and health surfacing.
- [x] Seed richer executive mock meeting data.
- [x] Make meeting brief deterministic in mock-first mode.
- [x] Make debrief deterministic in mock-first mode.
- [x] Add structured UI messaging for mock, cached, live, and partial states.

### Wave 2
- [x] Persist meeting workspace state in the database.
- [x] Add meeting workspace API for reads and note-draft saves.
- [x] Bind selected meeting context across brief and debrief screens.
- [x] Reopen a meeting and show prior generated artifacts.
- [x] Bind freeform chat to active meeting context at the screen level.

### Wave 3
- [x] Add request ids and route-level logging.
- [x] Add retry handling around Gmail, Drive, Docs, and Gmail send operations.
- [x] Add executive framing to `Today`.
- [x] Add executive framing to `Meeting Brief`.
- [x] Add executive framing to `Debrief`.
- [x] Add executive framing to `Insights`.
- [ ] Add automated test coverage for the new workflow state and fallback paths.
- [x] Validate Cloud Run deploy and live smoke tests after this hardening pass.

## Demo Script Coverage
### Morning Brief
- Data source: seeded tasks, seeded meetings, seeded executive signals.
- Fallback path: `/plan` returns mock executive brief when demo mode is on or live enrichment fails.
- Success output: top priorities, risky meetings, blocked decisions, delegation candidate.

### Apex Client Call Brief
- Data source: seeded meeting workspace payload for `Apex Client Call`.
- Fallback path: cached workspace brief, then mock seeded brief.
- Success output: why the meeting matters, open commitments, decision points, action continuity.

### Product Review Debrief
- Data source: seeded notes and seeded debrief payload for `Product Review`.
- Fallback path: saved notes draft, then mock debrief output.
- Success output: decisions, action items, owners, due dates, follow-up draft.

### Insights Review
- Data source: seeded week events and seeded task mix.
- Fallback path: none required because this screen is mock-first.
- Success output: strategic time, coordination load, commitments at risk, executive interventions.

### Task Prioritization
- Data source: seeded tasks with optional planner reply.
- Fallback path: retain current task order and show a stable explanatory message.
- Success output: visible task prioritization context even if the planner route is unavailable.

## Open Risks
- Live Gemini quota exhaustion can still push meeting flows into `partial` mode.
- Workspace OAuth material can drift or expire outside the repo.
- ADK tool-call payloads can remain inconsistent and require defensive formatting.
- Meeting workspace persistence currently assumes single-tenant usage.

## Verification Log
- 2026-04-30: Added persistent `meeting_workspaces` model and API routes for workspace reads and note draft saves.
- 2026-04-30: Added explicit backend settings for `DEMO_MODE`, `DEMO_USE_LIVE_ENRICHMENT`, request timeout, and Google API retries.
- 2026-04-30: Reworked `Today`, `Meeting Brief`, `Debrief`, `Insights`, `Week Planner`, and `SagePanel` to surface executive workflow context and cached/mock/live states.
- 2026-04-30: `python -m compileall sage` passed.
- 2026-04-30: `npm run build` passed in `sage/frontend`.
- 2026-04-30: Local TestClient smoke passed for `/health`, `/meeting-workspace`, `/brief`, and `/debrief`.
- 2026-04-30: Cloud Run redeploy passed at `https://sage-3zrh2be3pa-uc.a.run.app`.
- 2026-04-30: Live smoke passed for `/health`, `/plan`, `/meeting-workspace`, `/brief`, and `/debrief` with `demo_mode=true`.
