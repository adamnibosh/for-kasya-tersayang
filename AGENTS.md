# Project rules — for-kasya-tersayang

## Deploy notification (always)
After every `git push` to GitHub Pages:
1. Poll `gh api repos/adamnibosh/for-kasya-tersayang/pages` until `status` is `built` (up to ~3 min).
2. Verify the live site reflects the change (fetch URL, check key content).
3. Tell Adam in chat when deploy is **done** — include live URL and what changed.
4. If still building after timeout, say push succeeded and Pages is still building.

Use `deploy.ps1` for local deploys (Windows toast + beep + popup fallback).
Test alerts: `powershell -File deploy.ps1 -NotifyTest`
Agent must still confirm in chat after every push it makes.

## Rewind — ayat sweett moods
If user says **rewind** for messages: restore from `messages-original.snapshot.js`
(single 6-card swipe, no mood picker).