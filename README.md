# 🔥 Repo Roast: AI PR review for vibe coders

Every pull request gets a **0-10 score**, plus the **security holes, bugs and quick wins** that AI-written code usually ships with:
- leaked secrets (including `NEXT_PUBLIC_` / `VITE_` vars that ship to the browser)
- missing auth or ownership checks (IDOR) and missing Supabase RLS
- injection, unvalidated input, hand-rolled crypto

It's free and open source. **Bring your own key** for any OpenAI-compatible API (OpenAI, OpenRouter, Groq, Together, a local server). A typical PR costs a fraction of a cent on a small model. It posts one comment per PR and updates that comment on new pushes.

## Setup (2 minutes)
1. Add your key as a repo secret: **Settings → Secrets and variables → Actions → New secret** named `ROAST_API_KEY`.
2. Create `.github/workflows/repo-roast.yml`:

```yaml
name: Repo Roast
on: pull_request
permissions:
  contents: read
  pull-requests: write
jobs:
  roast:
    runs-on: ubuntu-latest
    steps:
      - uses: promptmedic-media/repo-roast-action@v1
        with:
          api-key: ${{ secrets.ROAST_API_KEY }}
          # base-url: https://openrouter.ai/api/v1   # optional, any OpenAI-compatible API
          # model: gpt-4o-mini                        # optional
          # focus: auth and payments                  # optional
```

## Example comment ([live demo PR](https://github.com/promptmedic-media/repo-roast-action/pull/1))
> ## 🔥 Repo Roast: 🟡 6/10
> > Solid SaaS skeleton, but auth logic forgot to hang up the phone.
> ### 🔒 Security
> - utils/auth-helpers/server.ts: redirect path set but execution continues; return early
> ### ⚡ Quick wins
> - utils/supabase/server.ts: assert env vars exist before createServerClient

## Inputs
| input | default | |
|---|---|---|
| `api-key` | (required) | OpenAI-compatible key |
| `base-url` | `https://api.openai.com/v1` | API base URL |
| `model` | `gpt-4o-mini` | model name |
| `focus` | | optional review focus |
| `max-diff-chars` | `60000` | diff truncation |

Output: `score`.

## More from Prompt Medic
- Roast a whole repo or fix a prompt that isn't working, right in Discord: [add the free bot](https://discord.com/oauth2/authorize?client_id=1560480862028439552)
- [Vibe Code Roast Leaderboard](https://promptmedic-media.github.io/prompt-medic/roast/leaderboard.html) · [Security checklist](https://promptmedic-media.github.io/prompt-medic/guides/vibe-coding-security-checklist.html)

This is an automated AI review and it can be wrong. It is not a security audit. MIT licensed.
