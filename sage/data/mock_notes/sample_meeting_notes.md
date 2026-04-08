# Product Review - March 31, 2026

**Attendees:** Sarah (PM), Dev (Eng Lead), Priya (Design), Ravi (QA)

## Key Decisions
- Q3 roadmap will prioritise the mobile checkout flow over the dashboard redesign.
- Auth service refactor (PR #247) must ship before April 10 deploy window.
- Design system tokens to be finalised by Priya before next sprint.

## Action Items
- [ ] Dev: merge auth service PR by April 8
- [ ] Sarah: update roadmap doc with Q3 priorities
- [ ] Priya: share design token spec by April 9
- [ ] Ravi: complete regression suite for auth changes

## Discussion Notes
The team agreed the current dashboard redesign scope is too large for Q3. Sarah will split it into two phases — phase 1 (navigation and search) in Q3, phase 2 (analytics widgets) in Q4.

Ravi flagged two edge cases in the auth refactor that need additional test coverage. Dev will address before merge.

---

# Client Call - Apex Solutions - April 3, 2026

**Attendees:** Me, James (Apex CTO), Linda (Apex Procurement)

## Context
Apex is evaluating our platform for their 5,000-seat enterprise deployment. Budget approved, timeline is Q2.

## Key Points Discussed
- They need SSO via Okta — confirmed on our roadmap for May.
- Data residency must be EU — our EU region is live, no blocker.
- Pricing: they want volume discount on the 5,000 seat tier. Send revised proposal.

## Action Items
- [ ] Send revised proposal with 5k-seat pricing by April 9
- [ ] Confirm EU data residency SLA in writing
- [ ] Schedule technical deep-dive with their infra team (target: week of April 14)

---

# Q2 Planning Sync - April 1, 2026

**Attendees:** Full leadership team

## Q2 Revenue Target
$4.2M — up 18% from Q1 actual. Breakdown:
- New logos: $1.8M (pipeline looks healthy, 3 deals in final stage)
- Expansion: $1.4M (Apex + two upsell motions in progress)
- Renewals: $1.0M (85% renewal rate assumed)

## Risks
- Apex deal could slip to Q3 if procurement takes longer than expected.
- Engineering capacity is tight — auth refactor is delaying two growth features.

## Next Steps
- Q2 revenue report to board by April 11.
- Weekly pipeline review every Monday 9am.
