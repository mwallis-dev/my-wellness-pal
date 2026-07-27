---
name: commit
description: >-
  Create a local git commit for project changes while protecting private health
  records. Update any missing skill, README, or AGENTS.md description needed for
  the change. Use when the user asks to commit changes or requests a Cursor
  agent to create a git commit. Does not push to GitHub.
---

# Commit

Create a local commit for tracked project changes. Add any missing description the change needs. Never touch private health data. Never push.

## Hard privacy rules

- Never stage, commit, push, or sync anything under `health/`.
- If `health/` appears in `git status`, treat it as a failure of `.gitignore` and stop.
- Do not add, force-add, or amend health files into history.
- Do not include health values, screenshot paths, or daily record contents in commit messages.

## When to act

- Commit only when the user explicitly asks to commit.
- Never push, even if the user also mentions GitHub, sync, or publish.
- If there is nothing to commit, say so and stop. Do not create an empty commit.

## Safety protocol

- Never update git config.
- Never skip hooks (`--no-verify`, `--no-gpg-sign`, etc.) unless the user explicitly requests it.
- Never use interactive git flags (`-i`).
- Never run destructive or irreversible git commands (`push --force`, `reset --hard`, etc.) unless the user explicitly requests them.
- Never push to a remote as part of this skill.
- Avoid `git commit --amend` unless all of these are true:
  1. The user explicitly requested amend, or a commit succeeded but a hook modified files that must be included.
  2. `HEAD` was created by you in this conversation.
  3. The commit has not been pushed (`git status` shows the branch is ahead).
- If a commit fails or is rejected by a hook, fix the issue and create a **new** commit. Do not amend a failed commit.
- If the commit was already pushed, never amend unless the user explicitly requests it (and understands a force-push may be required).

## Workflow

Run these in parallel first:

1. `git status` — see staged, unstaged, and untracked files
2. `git diff` and `git diff --staged` — review what would be committed
3. `git log -5 --oneline` — match this repo's commit-message style

Then:

1. Confirm no `health/` paths are present in status or the staged set.
2. Add any description information the change needs before staging:
   - New or changed skills: keep `SKILL.md` frontmatter `description` and `agents/openai.yaml` display fields accurate and specific.
   - New skills or agent workflows: add or update the matching pointer in `AGENTS.md`.
   - User-facing project purpose changes: update `README.md` when it would otherwise leave the repo unexplained.
   - Commit message: write a clear subject, and add a short body when the why is not obvious from the subject alone.
   - Do not invent prose. Only add description that the change actually requires.
3. Stage the relevant project files, including any description updates from the step above.
4. Draft a concise commit message focused on why, not a file list.
   - Prefer verbs that match intent: `add`, `update`, `fix`, `refactor`, `docs`.
5. Commit with a HEREDOC:

```bash
git commit -m "$(cat <<'EOF'
Commit subject here.

Optional body when needed.

EOF
)"
```

6. Run `git status` to verify success.
7. Stop after the local commit. Do not push.

## What belongs in commits

Allowed examples: `AGENTS.md`, skills under `.agents/`, `.gitignore`, `.gitattributes`, `README.md`, and other tracked project scaffolding.

Never commit:

- `health/**`
- screenshots or media used for health capture
- secrets (`.env`, credentials, tokens)
- local-only scratch files the user did not ask to include

If the user asks to commit a secrets file, warn and refuse that path.

## Response style

After finishing, report briefly:

- What was committed (high level)
- Any description files or fields updated
- The commit message
- That the commit is local only (not pushed)
- Anything skipped for privacy or because it was out of scope
