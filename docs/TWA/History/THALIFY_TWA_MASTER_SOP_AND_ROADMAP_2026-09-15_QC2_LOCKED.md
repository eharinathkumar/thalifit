# Thalify TWA — Master SOP and Roadmap — QC2 Locked Snapshot

**Snapshot status:** Immutable milestone record for the Thalify TWA only.

**Locked baseline:** v5.6.17 + TWA-QC2 recovery/update regression gate

**Lock date:** 2026-09-15

**Repository:** `eharinathkumar/thalifit`

## Milestone summary

TWA-QC2 extends the locked v5.6.17 TWA baseline with permanent recovery and installed-PWA update regression coverage. The functional QC2 gate passed in GitHub Actions TWA QC run #6 against commit `f1e46fae953caad35090fa04457ae5ecfc7e6f8e`.

The locked gate verifies:

- static shell/version/cache consistency
- four longitudinal personas across Chromium and WebKit
- deterministic weekly check-in behavior
- zero unexpected native browser dialogs
- mobile layout/error/screenshot coverage
- backup → erase local Thalify state → restore
- exact restored `mdp_*` state comparison
- rendered profile verification after restore
- simulated previous installed-PWA cache
- current service-worker activation
- stale-cache removal
- current v5.6.17 shell/QC marker after update
- stale shell not rendered

## QC2 audit history

The initial QC2 workflow run #5 failed in the installed-PWA upgrade assertion. Artifact inspection established that the old cache had already been removed, the current v5.6.17 layer was active, and the stale shell did not render. The failing assertion had treated `data-thalify-twa-feature-release` as the global version even though that attribute belongs to the older meal-pack feature layer and reports `5.6.14`.

The harness was corrected to use `window.__thalifyQC.version` as the authoritative current shell/QC version and to verify the branded-dialog layer. The full gate was rerun without bypassing any required test. Run #6 passed. The run #5 failure is therefore classified as a **QC harness defect**, not a production stale-cache regression.

## Locked operating rules

1. TWA and native Android SOPs, release baselines, QC artifacts, and roadmaps remain separate.
2. `main` is deployable; branch/PR changes merge only after the permanent TWA gate is green.
3. Every user-reported regression should become a deterministic automated test when practical.
4. No user-facing native browser `alert()`, `confirm()`, or `prompt()` is acceptable; use Thalify-branded in-app dialogs.
5. Failed QC must be investigated and classified before code or assertions are changed.
6. Do not weaken a gate simply to obtain a green run.
7. Installed-PWA upgrades must be tested from an older cached state, not only from clean install.
8. Recovery must preserve exact persisted Thalify state for covered `mdp_*` data.

## Four locked QC personas

| Persona | Food profile | Exercise pattern | Primary QC purpose |
|---|---|---|---|
| Priya | Vegetarian; Indian/Greek leaning | Strength + walking | mixed meal history, weekly check-in, recovery reference persona |
| Maya | Vegan; soy allergy | Yoga + cycling + walking | exclusion/allergy handling and plant-based path |
| Marcus | Unrestricted; imperial units | Strength + running | unit variation, higher-activity path |
| Elena | Eggitarian; tree-nut allergy | Resistance bands + swimming + Pilates | allergy + mixed activity path |

## Permanent gate after QC2

### Gate A — static shell

- service-worker/app/cache version consistency
- required versioned scripts present
- manifest/start URL correct
- no new legacy native-dialog paths
- required QC files present

### Gate B — Chromium + WebKit persona journeys

- all four personas complete longitudinal flows in both engines
- Today/Kitchen/Trends/Profile render
- weekly check-in uses deterministic mocked AI
- no unexpected JavaScript/console errors
- no native hostname dialogs
- no material mobile horizontal overflow
- screenshots retained

### Gate C — destructive/data-entry UX

- Shopping List branded delete/cancel behavior
- meal-pack destructive behavior with history preservation
- branded weight/readings/serving entry
- no fallback to browser-native hostname prompts

### Gate D — recovery/update

- create backup representation
- erase local Thalify data
- restore exact data
- reload and render restored profile
- seed prior-version PWA cache
- activate current service worker
- remove stale cache
- verify current v5.6.17 shell marker
- prove stale shell does not render

## Roadmap from this lock

### TWA-QC3 — next recommended

- test the real user-facing exported backup file and import controls
- malformed/corrupt backup rejection with safe messaging
- partial/older backup migration
- offline launch from service-worker cache
- reconnect after offline use without data loss
- update while app remains open, including controlled refresh
- tablet viewport matrix
- light- and dark-theme screenshot coverage for highest-risk screens

### TWA-QC4 — product journey expansion

- real food search/add/edit/remove
- pantry add/remove/low-stock
- meal planning → shopping list → check-off/delete/cancel
- workout logging
- improving and worsening weekly trends/check-ins
- profile goal/unit changes mid-history
- backup/restore after weekly check-in and meal-plan creation

### TWA-QC5 — TWA maintenance through eventual retirement decision

Keep the TWA stable and permanently regression-tested while native Android becomes primary. Do not remove TWA coverage without an explicit retirement decision.

## Locked milestone record

- **App/runtime baseline:** v5.6.17
- **QC layer:** TWA-QC2
- **Functional passing workflow:** TWA QC run #6
- **Functional passing commit:** `f1e46fae953caad35090fa04457ae5ecfc7e6f8e`
- **Functional gate status:** Static shell PASS; Android-Chromium + iPhone-WebKit persona/recovery PASS
- **Next phase:** TWA-QC3

This file is a historical snapshot. Future changes belong in `docs/TWA/THALIFY_TWA_MASTER_SOP_AND_ROADMAP_CURRENT.md` and in a new dated locked snapshot when the next major TWA QC milestone is locked.
