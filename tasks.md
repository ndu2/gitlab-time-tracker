# Refactoring / Modernization Tasks

From the design & tech-stack review (2026-07-04), branch `dropXlsOutput`.

## Done

- [x] Rewrite `report` command as flat async/await; fix double-`done` callbacks,
      unhandled `getIssues()` rejection, resolve-after-reject flow (`31ee12e`)
- [x] Send API token only via headers, never in URL query string or POST body (`374e2f8`)
- [x] Add tests for `Output.calculate()`/`prepare()` and `Frame` persistence (`a2524cf`)

## Design

- [x] Throw `Error` objects instead of strings (`timekeeper.js`, `frame.js`,
      `gitlab-client.js`, `frameCollection.js`); include HTTP status, path and
      GitLab error body in `GitlabClient` errors. Then switch the frame specs
      to idiomatic `expect(...).to.throw(/Start date/)`.
- [x] Make `frame.write()` atomic: replace `unlinkSync` + `appendFileSync` with
      `writeFileSync` (or temp file + rename).
- [x] Extract billing/aggregation logic (`calculate()`) out of the `Output`
      base class into a report model; presentation layer should only render.
      Behavior is pinned by `spec/output/base.spec.js`.
- [x] Remove shared `Config` mutation: stop `config.set('project', ...)` inside
      the report parallel loop (only safe because runners = 1); pass the
      project into `Report` explicitly. Drop unused `EventEmitter` inheritance;
      reconsider magic special cases in `config.get()`.
- [x] Convert callback-style `forEach(item, done)` in `FrameCollection` /
      `ReportCollection` to async iteration; removes try/done boilerplate.
- [x] Minor: capitalize class names (`config`, `frame`, `cli`); move
      `ReportCollection`'s module-level `projlist` into the instance
      (currently leaks state across instances).

## Tech stack

- [x] Replace `moment` + `moment-timezone` with Luxon or dayjs
      (biggest binary-size win for the pkg build).
- [ ] Drop `async` dependency: only `eachLimit` is used — replace with a small
      native concurrency limiter or `p-limit`.
- [ ] Replace `colors` (abandoned, 2022 sabotage incident) with
      `picocolors` or `chalk`.
- [ ] Replace `read-yaml` (ancient wrapper) with `js-yaml` directly;
      replace `node-spinner` 0.0.4 with a maintained alternative.
- [ ] Align esbuild target (`node20`) with `engines`/pkg (`node24`).
