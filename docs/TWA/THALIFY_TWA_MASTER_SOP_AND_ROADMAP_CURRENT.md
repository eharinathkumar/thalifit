# Thalify TWA — Master SOP and Roadmap

**Document status:** Current operational SOP for the Thalify TWA only. Keep this separate from the native Android SOP.

**Current locked TWA baseline:** v5.6.17 + TWA-QC2 recovery/update regression gate

**Latest lock date:** 2026-09-15

**Repository:** `eharinathkumar/thalifit`

## 1. Purpose

This document is the source of truth for the Thalify Trusted Web Activity / PWA track. It records what is already shipped, what is permanently required for QC, what is under active development, and what comes next. The native Android project has its own SOP and regression baseline and must not be conflated with this TWA document.

## 2. Operating rules

1. Every TWA feature release must increment the visible/internal app version and the service-worker cache version.
2. `main` is the deployable branch. Feature/QC changes should be built on a branch, opened as a pull request, and merged only after the permanent TWA QC gate is green.
3. The TWA and native Android tracks may be developed in tandem, but fixes, release numbers, QC results, artifacts, and roadmaps are tracked separately.
4. No user-facing native browser `alert()`, `confirm()`, or `prompt()` is acceptable. All user interactions must use Thalify-branded in-app dialogs with action-specific wording.
5. Any regression found by a real user should become a deterministic automated test whenever practical.
6. A build is not considered QC-clean merely because the homepage loads. Persona journeys, mobile layout, persistence, destructive actions, service-worker behavior, and recovery paths are part of the release gate.
7. A failed QC run is never silently ignored. Record whether the failure was an app regression, environment problem, or harness defect; fix the cause; then rerun the complete applicable gate.

## 3. Current TWA baseline — v5.6.17 + QC2

v5.6.17 remains the current app/runtime baseline. TWA-QC2 is now the locked permanent recovery/update regression layer on top of that baseline.

### 3.1 Branded dialog layer

The release replaces or intercepts user-facing browser hostname dialogs with Thalify in-app dialogs. Current covered actions include:

- delete shopping list
- update/replace/delete meal packs
- log weight
- log blood pressure and other readings
- edit serving quantity
- informational notices and validation messages

Destructive dialogs must state the object being changed, the consequence, whether history is preserved, and whether the action can be undone.

### 3.2 Permanent browser QC

The permanent Playwright harness runs on:

- Chromium — Android/TWA-oriented browser path
- WebKit — iPhone/Home-Screen-oriented browser path

The four longitudinal QC personas are intentionally different in diet, cuisines, allergies, food history, units, goals, and activity patterns. The suite exercises Today, Kitchen, Trends, Profile, weekly check-in, local persistence, mobile overflow, browser errors, screenshots, native-dialog interception, backup/restore recovery, and installed-PWA update behavior.

### 3.3 Current QC result

**TWA-QC2 locked PASS — 2026-09-15.** GitHub Actions TWA QC run #6 passed the static shell gate and the complete Android-Chromium + iPhone-WebKit persona/recovery suite against commit `f1e46fae953caad35090fa04457ae5ecfc7e6f8e`.

The QC2 suite now permanently verifies:

- backup → erase local Thalify state → restore → exact persisted-state comparison
- rendered profile recovery after restore
- simulated prior-version installed-PWA cache
- current service-worker activation
- stale cache removal
- current Thalify shell/version marker after update
- stale shell not rendered
- zero unexpected native browser dialogs, page errors, or console errors in these recovery paths

### 3.4 QC2 audit note

The initial QC2 run #5 failed in the upgrade regression test. Investigation of the Playwright artifacts showed that the stale cache had actually been removed and the current v5.6.17 QC layer had loaded correctly. The harness had incorrectly treated `data-thalify-twa-feature-release` as the global app version; that marker belongs to the older meal-pack feature layer and intentionally reports its own feature version (`5.6.14`).

The regression assertion was corrected to use the authoritative current-shell marker `window.__thalifyQC.version` and to verify the branded-dialog layer. The complete gate was rerun rather than bypassed. Run #6 then passed. This was classified as a **QC harness defect, not a production stale-cache regression**.

## 4. QC persona matrix

| Persona | Food profile | Exercise pattern | Primary QC purpose |
|---|---|---|---|
| Priya | Vegetarian; Indian/Greek leaning | Strength + walking | mixed meal history, weekly check-in, recovery reference persona |
| Maya | Vegan; soy allergy | Yoga + cycling + walking | exclusion/allergy handling and plant-based path |
| Marcus | Unrestricted; imperial units | Strength + running | unit variation, higher-activity path |
| Elena | Eggitarian; tree-nut allergy | Resistance bands + swimming + Pilates | allergy + mixed activity path |

Each persona carries multi-day food/activity state and a due weekly check-in so longitudinal behavior—not only empty-state UI—is exercised.

## 5. Permanent TWA release gate

A TWA release candidate is considered QC-clean only when all applicable sections below pass.

### Gate A — static shell validation

- service-worker version and cache naming are internally consistent
- required TWA scripts are present and loaded
- manifest/start URL points to the intended release
- native browser dialog usage does not exceed the locked legacy ceiling and new code does not introduce new direct dialog paths
- required QC files remain present

### Gate B — cross-browser persona journeys

- all four personas complete their longitudinal journeys in Chromium
- all four personas complete their longitudinal journeys in WebKit
- Today/Kitchen/Trends/Profile render without runtime failure
- no unexpected page errors or console errors
- no user-facing native browser dialogs
- no material horizontal overflow at mobile viewport sizes
- weekly check-in completes with deterministic mocked AI behavior
- screenshots are captured into QC artifacts

### Gate C — destructive and data-entry interactions

- shopping-list deletion uses branded confirmation and preserves data on Cancel
- confirmed deletion removes only intended data
- meal-pack deletion preserves historical food logs
- weight entry uses branded input
- blood pressure uses branded two-step input
- serving/edit flows do not fall back to hostname prompts

### Gate D — recovery and upgrade regression

TWA-QC2 makes the following permanent:

- full `mdp_*` Thalify state snapshot
- simulated backup creation
- local Thalify data erase
- restore from backup
- exact restored-state comparison
- rendered profile verification after restore
- simulated prior-version PWA cache
- activation of the current service worker
- deletion/supersession of stale TWA cache
- verification that the current shell—not the stale shell—is rendered after update

The recovery/upgrade test is intended to prevent recurrence of installed-PWA users remaining on an obsolete shell after a release and to guard against data-loss regressions during recovery.

## 6. QC artifact policy

Every CI QC run should retain artifacts that make failures diagnosable. Current expected artifacts include screenshots for persona tabs, weekly check-in, branded dialogs, recovery before/after state, and current-shell upgrade verification. Failure traces/screenshots should be retained whenever Playwright produces them.

When a gate fails, inspect the artifacts before changing production code. Do not weaken an assertion merely to obtain a green result; first establish whether the failure is in the product, test harness, or environment.

## 7. Versioning and release procedure

For each future TWA feature release:

1. branch from the latest QC-clean `main`
2. implement the smallest coherent release scope
3. increment app/TWA version
4. increment service-worker cache key
5. update manifest/start URL where required
6. add or update regression tests for changed behavior
7. update this CURRENT SOP with the new baseline, completed work, outstanding defects, and next roadmap item
8. run the full GitHub Actions TWA QC gate
9. do not merge if any permanent gate fails
10. inspect screenshots/artifacts for visual regressions even when assertions are green
11. merge only after QC is green
12. after merge, verify deployed version/service worker on the public TWA path
13. save a dated locked SOP snapshot for major milestones

QC-only harness/SOP changes do not require an app-version bump when they do not change runtime product behavior. They still require the complete applicable QC gate before merge.

## 8. Roadmap

### Phase TWA-QC1 — complete / locked

- four-profile longitudinal QC matrix
- Chromium + WebKit coverage
- deterministic weekly check-in AI mock
- branded dialog system
- native-dialog runtime trap
- static shell gate
- mobile overflow checks
- QC screenshot artifacts

### Phase TWA-QC2 — complete / locked 2026-09-15

- backup → erase → restore regression
- stale installed-PWA → current service-worker migration regression
- exact persisted-state comparison after restore
- stale-cache deletion assertion
- current-shell verification after upgrade
- separate TWA SOP/current-state tracking
- failed-run classification and rerun discipline validated in practice

### Phase TWA-QC3 — next recommended hardening

- exercise real exported backup file through the user-facing export/import controls, not only storage roundtrip
- malformed/corrupt backup rejection test with safe user messaging
- partial/older backup migration test
- offline launch from service-worker cache
- reconnect after offline session without data loss
- service-worker update while app is open, including controlled refresh behavior
- tablet viewport matrix in addition to phone sizes
- light-theme and dark-theme screenshots for highest-risk TWA screens

### Phase TWA-QC4 — product journey expansion

- actual food search/add/edit/remove journeys instead of seeded history only
- Kitchen pantry add/remove/low-stock journey
- meal planning → shopping list → check-off → delete/cancel journeys
- workout logging journeys
- weekly check-in across both improving and worsening trends
- profile edits and goal/unit changes mid-history
- backup/restore after a weekly check-in and after meal-plan creation

### Phase TWA-QC5 — pre-retirement of TWA

As native Android becomes the primary production client, keep the TWA stable and regression-tested until an explicit retirement decision. Do not silently remove TWA coverage simply because native feature parity improves.

## 9. Known architectural debt

The TWA remains a layered versioned-script application with older legacy behavior underneath newer compatibility layers. v5.6.17 safely intercepts legacy browser dialogs, but the long-term preferred state is to remove obsolete direct `alert/confirm/prompt` code at the source rather than rely indefinitely on interception.

Some older feature layers expose their own feature-release data attributes. Those are not authoritative global app-version markers. Global release/update QC must use the newest shell/QC release marker or another explicitly designated global build identifier.

The service worker is a critical production component because users may retain previously cached shells. Any future release that changes loading behavior must be tested as an upgrade from an already-installed older PWA, not only as a clean install.

## 10. Definition of done for future TWA work

A TWA task is done only when the implementation works, the applicable regression test exists, the complete TWA QC gate is green, the resulting screenshots/artifacts have been reviewed for obvious visual defects, this SOP reflects any baseline/roadmap change, and the change is merged to `main` only after those checks.

## 11. Locked milestone record

- **Baseline:** Thalify TWA v5.6.17
- **QC layer:** TWA-QC2
- **Lock date:** 2026-09-15
- **Passing workflow:** TWA QC run #6
- **Passing commit:** `f1e46fae953caad35090fa04457ae5ecfc7e6f8e`
- **Gate status:** Static shell PASS; Android-Chromium + iPhone-WebKit persona/recovery PASS
- **Next recommended phase:** TWA-QC3 backup-file/offline/update-in-place/theme/tablet hardening
