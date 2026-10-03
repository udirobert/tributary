# Decisions & Findings

## Cloudflare Artifacts

Based on the documentation fetched from Cloudflare Developers on Oct 3, 2026:

### Confirmed Capabilities

1. **Workers Binding (`env.ARTIFACTS`)**: Supports `create`, `get`, `list`, `import`, `delete`, `info`, `createToken`, `listTokens`, `revokeToken`, `fork`, `log`, `readCommit`, `readTree`, `readBlob`, and `readFile`.
2. **Git Protocol**: Repos are exposed as Git smart HTTP remotes (`https://<ACCOUNT_ID>.artifacts.cloudflare.net/git/<namespace>/<repo>.git`). Supports token-based auth (`Bearer` or HTTP Basic with token secret as password). Supports Git v1/v2 for fetch/clone, v1 for push.
3. **Event Subscriptions**: There are structured events for `cf.artifacts.repo.created`, `repo.forked`, `repo.imported`, `repo.pushed`, `repo.cloned`, `repo.fetched`, etc., which we can subscribe to via Cloudflare Queues/Event Subscriptions.

### Missing/Unsupported Native Capabilities (Assumptions & Fallbacks)

1. **Server-side Merge/Rebase/Diff API**:
   - _Finding_: No native merge, diff, or conflict resolution API was found in the Workers Binding or REST API.
   - _Fallback_: We must handle merges ourselves. We will use a Cloudflare Sandbox (or `isomorphic-git` inside a Worker) to check out the repos, perform the merge/rebase, and push the results back.
2. **Git Notes**:
   - _Finding_: Not explicitly mentioned as a native feature in the bindings.
   - _Fallback_: Git notes are stored under `refs/notes/`. We can likely push them via the standard Git protocol if needed, or store metadata in a Durable Object. We will use a DO to track claim registries instead of git notes, as it is more robust for concurrency.

## Plan for Step 0 Spike

1. Use Wrangler to configure an Artifacts namespace (`tributary-spike`) and create a basic Worker.
2. The Worker will have endpoints to:
   - Import a small open-source repo into Artifacts (using `env.ARTIFACTS.import`).
   - Fork the repo into a task repo and mint a token.
   - A script will use the token to push a commit to the fork.
   - The Worker (or a Sandbox invoked by the Worker) will fetch the fork, perform a programmatic merge onto trunk, and push it.

## Safety Toolchain (Oct 3, 2026)

- ESLint + Prettier + Husky hooks (pre-commit: gitleaks staged scan + lint-staged; pre-push: tsc + eslint). Secrets CLI: gitleaks 8.30 (`gitleaks git --staged`).
- **typescript-eslint does not support TS 7 yet** (tracked in typescript-eslint#10940). Per the TS 7 side-by-side docs we install `@typescript/typescript6` and a `postinstall` script (`scripts/link-ts6-for-eslint.mjs`) nests it as `typescript` for every `@typescript-eslint/*` package, `typescript-eslint`, and `ts-api-utils`. Re-run `npm run postinstall` if eslint errors with "does not support TS 7.0" after an install. Remove the workaround once typescript-eslint ships TS 7 support.
- `.npmrc` sets `legacy-peer-deps=true` because TS 7 sits outside typescript-eslint's peer range.
