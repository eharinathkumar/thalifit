# Thalify TWA — Master SOP, QC Baseline & Roadmap

**Document type:** Living TWA/PWA operating SOP  
**Track:** TWA only — keep separate from the native Android SOP and native release artifacts  
**Repository:** `eharinathkumar/thalifit`  
**Current app shell baseline:** Thalify TWA **v5.6.17**  
**Current QC harness:** Rev B candidate on `agent/twa-qc2-backup-update-sop`  
**Last updated:** 2026-09-14 ET  

---

## 1. Purpose

This document is the canonical operating record for the Thalify TWA/PWA line. It exists so a future engineer or ChatGPT session can determine, without reconstructing old chats:

- what the current TWA baseline is;
- what is deployed versus experimental;
- what permanent QC gates must pass before a TWA change is considered clean;
- which regressions have already occurred and are now protected by tests;
- how releases are branched, tested, merged, deployed, and documented;
- what the near- and long-term TWA roadmap is.

The native Android app has its own SOP and locked baselines. **Do not merge the TWA and native SOPs.** Product behavior may converge, but release state, versioning, QC artifacts, build systems, and deployment remain independently tracked.

---

## 2. Current architecture

The TWA/PWA is served from GitHub Pages and uses the repository root as the web shell. Key components:

- `index.html` — legacy/base application shell and core localStorage behavior.
- `manifest.json` — installed-PWA metadata and versioned `start_url`.
- `sw.js` — service worker, shell version, cache version, asset list, and versioned enhancement-script injection.
- `twa-v*.js` — additive TWA enhancement layers. Their order in `sw.js` is part of the release contract.
- `twa-v577.js` — v5.6.17 branded-dialog hardening layer; must currently load last.
- `qc/` — permanent Playwright and static QC harness.
- `.github/workflows/twa-qc.yml` — pull-request QC automation.

Primary persisted state is stored in browser `localStorage` under `mdp_*` keys. Backups export these keys to JSON and restore them through the in-app import path.

The TWA AI worker is mocked deterministically in browser QC so CI validates the app path without depending on model availability, nondeterministic text, or external service health.

---

## 3. Locked / candidate baselines

### v5.6.17 — user-facing dialog hardening baseline

Status: **merged to `main`; QC-clean**.

Permanent behavior added:

- Browser-native `alert()`, `confirm()`, and `prompt()` UI is prevented from surfacing GitHub-hostname banners to users.
- Shopping-list deletion uses a branded Thalify confirmation with destructive-action wording.
- Meal-pack update/replace/delete actions use branded dialogs.
- Weight entry, serving-quantity entry, blood-pressure entry, and other health-reading inputs use branded in-app prompts.
- A runtime QC counter fails if a protected path falls through to a native browser dialog.

QC Rev A introduced four synthetic longitudinal personas, Android-style Chromium coverage, iPhone-style WebKit coverage, deterministic weekly check-ins, screenshots, error trapping, mobile overflow checks, and a static native-dialog ceiling.

### QC Rev B — backup/restore + installed-PWA update hardening

Status: **candidate; do not call locked until its PR is fully green and merged**.

Adds two regression families:

1. **Backup → erase local data → restore** for all four personas on both Android-Chromium and iPhone-WebKit. The test downloads the real backup file, archives a copy in QC artifacts, removes all `mdp_*` local data, restores through the actual file-input path, waits through the reload, and verifies critical profile, food, activity, weights, readings, pantry, groceries, planned meals, schema, and daily-log state.
2. **Old installed PWA → current shell update** on both browser engines. The harness installs an intentionally old service worker and cache, verifies it controls the page, registers the real current `sw.js`, verifies controller takeover, verifies the old cache is deleted and the current cache is present, then loads the application and verifies the current shell/version contract.

QC Rev B also introduces a controlled local static server so service-worker scope headers can be tested without placing test-only old service workers at the public application root.

---

## 4. Permanent persona matrix

| Persona | Diet / restrictions | Cuisine bias | Activity pattern | Units | Goal |
|---|---|---|---|---|---|
| Priya | Vegetarian; peanut allergy; dislikes mushrooms | Indian + Greek | Strength + walking | Metric | Lose |
| Maya | Vegan; soy allergy; dislikes olives | Thai + Mexican | Yoga + cycling + walking | Metric | Maintain |
| Marcus | Unrestricted/meat; dislikes cottage cheese | American + Mexican | Strength + running | Imperial | Lose |
| Elena | Eggitarian; tree-nut allergy; dislikes tempeh | Mediterranean + Indian | Bands + swimming + Pilates | Metric | Gain |

Each persona carries three days of food logs, three days of activity, current and prior weight, pantry contents, five shopping-list items, profile targets, and a due weekly check-in.

The personas are test fixtures, not demo accounts and not production users.

---

## 5. TWA QC gate — release contract

A TWA change is **not QC-clean** unless every required gate below is green.

### Gate A — static shell gate

`npm run qc:static`

Checks include:

- service-worker shell version is the expected locked version;
- `manifest.json` `start_url` matches the shell version;
- enhancement scripts referenced by `sw.js` exist and parse;
- the current final hardening layer loads last;
- legacy browser-dialog call counts do not increase;
- branded-dialog hardening functions remain present;
- the dialog layer contains no `eharinathkumar.github.io` string;
- backup/export/import contract remains present;
- QC fixtures and the current TWA SOP remain present;
- backup/restore and installed-PWA-update browser tests remain in the permanent suite.

### Gate B — Android + iPhone browser journeys

`npm run qc:twa`

Runs Playwright on:

- Android-style Chromium (`Pixel 5` device profile);
- iPhone-style WebKit (`iPhone 13` device profile).

Permanent coverage includes:

- all four persona three-day food/activity journeys;
- Today, Kitchen, Trends, and Profile rendering;
- due weekly check-in and deterministic AI response;
- apply/keep-current check-in decisions;
- mobile horizontal-overflow guard;
- JavaScript exception and console-error trapping;
- screenshots;
- branded destructive confirmations and data-entry prompts;
- zero native browser dialogs on protected paths;
- Shopping List delete/cancel behavior;
- meal-pack deletion behavior;
- weight input and two-step blood-pressure input;
- backup → erase → restore for every persona;
- installed old-service-worker → current-service-worker upgrade.

### Gate C — artifacts

The GitHub Actions browser job must upload `qc-output/` even on failure. Expected contents can include:

- Playwright HTML report;
- test-results directories;
- traces/videos/screenshots on failures;
- persona screenshots;
- representative exported backup JSON files;
- installed-PWA update screenshots.

A green status without the expected artifact upload should be investigated before treating the run as a locked baseline.

---

## 6. Standard release procedure

1. Start from current `main` and create a focused TWA branch.
2. Read this SOP before modifying the shell or QC harness.
3. Keep TWA work separate from native Android source/releases.
4. Make the smallest coherent change set.
5. If user-facing TWA behavior or shell assets change, bump the TWA app version consistently across the service worker, manifest/start URL, package metadata where applicable, and QC expectations. **QC-only/documentation changes may advance the QC revision without pretending the shipped app changed versions.**
6. Run the static gate.
7. Run the full Android + iPhone Playwright suite.
8. Open/update a pull request only after the branch is internally coherent.
9. Do not merge a failing QC run.
10. When green, update this SOP with the new locked baseline and create a dated immutable snapshot under `docs/twa/history/` for major milestones.
11. Merge to `main`.
12. Verify `main` contains the intended service worker, manifest, latest enhancement layer, QC files, and SOP.
13. For user-facing releases, verify the live GitHub Pages/PWA path after deployment and confirm service-worker update behavior on a previously installed copy.

---

## 7. Versioning and baseline rules

- The **app shell version** describes shipped TWA behavior/cache state.
- The **QC harness revision** describes test coverage. It can advance without an app version bump if no shipped behavior changes.
- Never silently reuse an app version for a user-facing behavior change.
- `sw.js` cache names must change when the shell version changes so old cache state is retired.
- `manifest.json` `start_url` version must match the current shell version.
- Major QC-clean milestones receive a dated locked SOP snapshot; the `CURRENT` SOP remains editable.
- Failed candidates remain audit history but never become the copy-forward baseline.

---

## 8. Known regression history and permanent protections

### Browser hostname in dialogs

Observed symptom: Android Chrome displayed `eharinathkumar.github.io says...` above native confirmation text such as Shopping List deletion.

Permanent response: branded dialog layer plus runtime native-dialog failure and static legacy-call ceilings.

### iPhone / installed-PWA stale-version risk

Observed class of symptom: an installed Home Screen copy may continue presenting an older application state after a release.

Permanent response: QC Rev B installs an old worker/cache and verifies takeover by the current worker, cache retirement, and current-shell load on both Chromium and WebKit.

### Backup confidence risk

A backup button is not sufficient evidence that restoration works.

Permanent response: QC Rev B performs real file download, local-state erasure, real file-input restore, application reload, and domain-level state verification for every persona on both engines.

### WebKit service-worker request behavior

WebKit service-worker initiated requests can differ from Chromium and previously bypassed a page-level AI route mock.

Permanent response: deterministic AI mocking exists at both route and window-fetch levels while the real service worker remains enabled.

---

## 9. Roadmap

### Immediate — QC Rev B

- [x] Add real backup-download coverage.
- [x] Erase `mdp_*` local state inside QC.
- [x] Restore through the actual hidden backup file input.
- [x] Verify restored persona/profile/log/activity/kitchen state.
- [x] Add old-installed-PWA service-worker fixture.
- [x] Verify current worker takeover and old-cache deletion.
- [x] Run on Android-Chromium and iPhone-WebKit.
- [x] Establish this separate TWA SOP.
- [ ] Obtain fully green PR run.
- [ ] Mark QC Rev B locked and create dated history snapshot.
- [ ] Merge to `main` and verify main/deployment.

### Near term — harden the web release gate

- Add explicit dark-theme and light-theme visual journeys.
- Add offline cold-start / cached-shell tests and recovery after connectivity returns.
- Add malformed/corrupted backup rejection and wrong-schema restore tests.
- Add older-schema backup migration fixtures covering real historical storage shapes.
- Add tablet and small-phone responsive baselines in addition to phone profiles.
- Add accessibility checks for dialog focus, labels, tap targets, keyboard escape, and contrast-sensitive states.
- Add deterministic AI failure/timeout/retry tests in addition to AI success.
- Add live post-deploy smoke verification against the production Pages/custom-domain endpoint.

### Product-parity / maintenance roadmap

- Keep critical TWA fixes available while native Android remains the long-term primary application path.
- Maintain consistent food-unit behavior and saved-food migration between TWA and native.
- Keep weekly check-in semantics aligned with native longitudinal context behavior.
- Preserve Kitchen/Shopping usability while avoiding TWA-only architecture that blocks eventual native parity.
- Continue reducing legacy `index.html` dependence by moving behavior into versioned, testable modules when changes justify it.

### Longer-term release engineering

- Add performance budgets for initial shell load and heavy screens.
- Add visual-diff baselines for high-value screens.
- Add service-worker migration tests across more than one prior production version.
- Add deploy provenance to QC artifacts: source SHA, shell version, cache version, manifest version, and test matrix.
- Reassess whether the TWA should remain independently distributed once native Android covers all production workflows and migration risk is acceptably low.

---

## 10. Operator commands

Install dependencies:

```bash
npm install --no-audit --no-fund
npx playwright install chromium webkit
```

Run static gate:

```bash
npm run qc:static
```

Run browser gate:

```bash
npm run qc:twa
```

Run the complete local TWA gate:

```bash
npm run qc
```

CI uses `.github/workflows/twa-qc.yml` and uploads `qc-output/` as the TWA QC artifact.

---

## 11. Definition of done for a TWA milestone

A milestone is done only when:

- intended behavior is implemented;
- no known blocker remains in the changed area;
- static gate passes;
- Android-Chromium browser gate passes;
- iPhone-WebKit browser gate passes;
- expected QC artifacts are produced;
- versioning is internally consistent;
- this current SOP is updated;
- a major milestone has a dated locked history snapshot;
- merge/deploy state is unambiguous.

Do not label a candidate “QC-clean,” “locked,” or “baseline” before those conditions are satisfied.

---

## 12. Change log

### 2026-09-14 ET

- Started the separate TWA master SOP.
- Recorded v5.6.17 as the current merged user-facing baseline.
- Recorded QC Rev A as the four-persona Android/iPhone browser baseline.
- Added QC Rev B candidate scope: all-persona backup/erase/restore plus old-installed-PWA service-worker update simulation.
- Added release/versioning rules that keep QC revisions distinct from shipped app versions.
