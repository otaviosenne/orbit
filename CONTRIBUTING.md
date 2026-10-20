# Contributing to Orbit

Thanks for helping. Bug reports, ideas and pull requests are all welcome.

## Before you start

- Orbit is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). By sending a
  contribution you agree that it is released under the same license.
- For a larger change, open an issue first so we can agree on the approach.

## Set up

```bash
npm install
npm run demo        # build and run with made-up data; safe to screenshot
npm start           # build and run against your real Claude Code chats
```

See the [README](README.md#requirements) for the kitty and Hyprland setup, and
[docs/architecture.md](docs/architecture.md) for how the code fits together.

## Before you open a pull request

```bash
npm run typecheck
npm test
npm run build
```

All three must pass.

## Code style

Match the surrounding code. In particular:

- **TypeScript with explicit types**: parameters, return types and variables.
- **Small files and small functions**, each with one clear job.
- **No magic numbers**: name constants and explain the reason.
- **Comments explain why**, never what the code already says.
- **Everything in English**: code, comments, commits and docs.
- **Commits follow [Conventional Commits](https://www.conventionalcommits.org/)**, for example
  `feat(timeline): show closed chats` or `fix(panel): keep scroll on refresh`.
- Add or update tests in `tests/` for logic changes. Use `tests/fixtures/` for captured terminal output.

## Privacy in issues and pull requests

Orbit shows real conversations. **Never attach screenshots, logs or transcripts from your own chats.**
Run `npm run demo` and capture that instead. If a bug only shows with real data, describe it in
words and strip names, paths and message text.

If you add an IPC channel, also give it an answer in `src/demo/demo-routes.ts` (the type check
reminds you).
