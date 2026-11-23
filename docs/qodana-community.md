# Qodana Community static analysis

This repository is a Next.js / TypeScript application. **Qodana Community does
not support JavaScript, TypeScript, React or Next.js inspections.** It is not
equivalent to Qodana for JS, which requires a paid Qodana license.

The `.github/workflows/qodana-community.yml` workflow uses the free
`qodana-python-community` linter to inspect files that its bundled IDE supports,
such as YAML, JSON, HTML, XML and shell scripts. It does not pretend to inspect
application TypeScript. Continue to use `npm run lint` and `npm test` for
application code quality.

## CI behavior

- Runs for pull requests targeting `claude/new-session-b6um0m`, pushes to that
  branch, and manual `workflow_dispatch` events.
- Uses `JetBrains/qodana-action@v2026.2` with a matching Community linter version
  in `qodana.yaml` and the default `qodana.starter` inspection profile.
- Uses Docker on the GitHub-hosted Ubuntu runner. No paid license or
  `QODANA_TOKEN` secret is needed for Community linter execution.
- Uploads the Qodana result bundle as a GitHub Actions artifact
  (`qodana-report`); it does not upload SARIF to GitHub code scanning.
- Uses read-only repository permissions and does not post PR comments,
  push fixes, or send reports to Qodana Cloud.
- Excludes common generated directories (e.g. `node_modules`, `.next`,
  `out`, and `coverage`) from analysis.

The first run should be reviewed to confirm which inspections produce useful
results on this repository. Community has no TypeScript/JavaScript coverage;
adding such coverage within Qodana would require the paid `qodana-js` linter.

References:
- https://www.jetbrains.com/help/qodana/pricing.html
- https://www.jetbrains.com/help/qodana/python.html
- https://www.jetbrains.com/help/qodana/github.html
