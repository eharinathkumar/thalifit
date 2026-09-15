# Thalify TWA — Locked SOP Snapshot

**Locked baseline:** v5.6.17

**Snapshot date:** 2026-09-14 Eastern Time

This snapshot records the point at which the Thalify TWA established its permanent cross-browser QC foundation and branded-dialog baseline.

## Locked milestone

The v5.6.17 TWA baseline includes:

- Thalify-branded in-app confirmations and prompts in place of user-facing browser hostname dialogs
- explicit destructive-action wording for shopping-list and meal-pack operations
- branded data-entry dialogs for weight, blood pressure, readings, and quantity edits
- four longitudinal QC personas with distinct diets, cuisines, allergies, food logs, units, goals, and exercise patterns
- Android-oriented Chromium coverage
- iPhone/Home-Screen-oriented WebKit coverage
- deterministic weekly check-in AI responses for repeatable QC
- Today, Kitchen, Trends, Profile, weekly check-in, mobile overflow, JavaScript/console error, screenshot, persistence, and native-browser-dialog checks
- permanent GitHub Actions static + browser QC workflow

The successful v5.6.17 browser gate completed 10 tests across Chromium and WebKit before merge. Treat v5.6.17 as the locked TWA regression baseline for subsequent TWA work.

## Next hardening layer

The immediate follow-on QC layer is TWA-QC2:

- backup snapshot → erase Thalify local state → restore → exact state verification
- prior-version installed-PWA cache simulation → current service-worker activation → stale-cache removal → current-shell verification
- separate ongoing TWA SOP/current-state tracking under `docs/TWA/`

For current roadmap/status after this snapshot, use `docs/TWA/THALIFY_TWA_MASTER_SOP_AND_ROADMAP_CURRENT.md`.
