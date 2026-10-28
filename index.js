// Repo Roast GitHub Action by Prompt Medic. Zero dependencies (Node 20).
const fs = require('fs');
const input = (n, d = '') => (process.env[`INPUT_${n.replace(/ /g, '_').toUpperCase()}`] || d).trim();
const SYSTEM = `You are Repo Roast, a blunt but fair senior engineer reviewing a pull request diff (often AI-generated / vibe-coded).
Respond ONLY with JSON: {"score": <integer 0-10 overall quality of this change>, "verdict": "one punchy, funny line", "security": ["..."], "bugs": ["..."], "quick_wins": ["..."]}
Max 5 items per list, each under 220 characters, cite file names. Only report issues supported by the diff; empty list if nothing real. Prioritise: leaked secrets (incl. NEXT_PUBLIC_/VITE_ vars), missing auth/ownership checks (IDOR), missing Supabase RLS, injection, unsafe eval, unvalidated input, hand-rolled crypto. Never claim a package, runtime or tool version "does not exist": your knowledge has a cutoff and newer versions are likely real.`;
function render(r, meta) {
  const em = r.score >= 8 ? '🟢' : r.score >= 5 ? '🟡' : '🔴';
  const li = a => (a.length ? a.map(x => `- ${x}`).join('\n') : '_Nothing major found._');
  return `<!-- repo-roast -->\n## 🔥 Repo Roast: ${em} ${r.score}/10\n> ${r.verdict}\n\n### 🔒 Security\n${li(r.security)}\n\n### 🐛 Bugs\n${li(r.bugs)}\n\n### ⚡ Quick wins\n${li(r.quickWins)}\n\n<sub>Reviewed ${meta.files} files${meta.truncated ? ' (diff truncated)' : ''} · automated AI review, may be wrong · [Repo Roast](https://github.com/promptmedic-media/repo-roast-action) by [Prompt Medic](https://promptmedic-media.github.io/prompt-medic/)</sub>`;
}
async function llm(diff, o) {
  const res = await fetch(`${o.baseUrl.replace(/\/+$/, '')}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${o.apiKey}` },
    body: JSON.stringify({ model: o.model, temperature: 0.3, max_tokens: 4000, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: `TODAY: ${new Date().toISOString().slice(0, 10)}. Version numbers newer than you know are real; do not report them.\n` + (o.focus ? `FOCUS: ${o.focus}\n\n` : '') + diff }] }) });
  if (!res.ok) throw new Error(`LLM API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const m = ((await res.json()).choices?.[0]?.message?.content || '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Model returned no JSON. Try a different model.');
  const j = JSON.parse(m[0]);
  const FAKE_VER = /(non-?existent|does(n't| not) exist|impossible|fake|future|time.?travel)/i;
  const l = a => (Array.isArray(a) ? a : []).map(String).filter(x => !(FAKE_VER.test(x) && /(version|node|npm|@\d|\d+\.\d+)/i.test(x))).slice(0, 5);
  return { score: Math.min(10, Math.max(0, Math.round(Number(j.score) || 0))), verdict: String(j.verdict || ''), security: l(j.security), bugs: l(j.bugs), quickWins: l(j.quick_wins) };
}
async function gh(path, token, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, { ...init, headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'repo-roast-action', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}: ${(await res.text()).slice(0, 200)}`);
  return res;
}
async function main() {
  const token = input('github-token'), max = parseInt(input('max-diff-chars', '60000'), 10);
  let repo = process.env.GITHUB_REPOSITORY, pr = process.env.ROAST_PR;
  if (!pr && process.env.GITHUB_EVENT_PATH) { const ev = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')); pr = ev.pull_request?.number; }
  if (!repo || !pr) { console.log('Repo Roast: not a pull_request event, nothing to do.'); return; }
  let diff = await (await gh(`/repos/${repo}/pulls/${pr}`, token, { headers: { Accept: 'application/vnd.github.v3.diff' } })).text();
  const files = (diff.match(/^diff --git /gm) || []).length, truncated = diff.length > max; diff = diff.slice(0, max);
  const opts = { apiKey: input('api-key'), baseUrl: input('base-url', 'https://api.openai.com/v1'), model: input('model', 'gpt-4o-mini'), focus: input('focus') };
  let r; try { r = await llm(diff, opts); } catch (e) { console.log(`Retrying once: ${e.message}`); r = await llm(diff, opts); }
  const body = render(r, { files, truncated });
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `score=${r.score}\n`);
  if (process.env.ROAST_DRY_RUN) { console.log(body); return; }
  const comments = await (await gh(`/repos/${repo}/issues/${pr}/comments?per_page=100`, token)).json();
  const mine = comments.find(c => c.body?.startsWith('<!-- repo-roast -->'));
  if (mine) await gh(`/repos/${repo}/issues/comments/${mine.id}`, token, { method: 'PATCH', body: JSON.stringify({ body }) });
  else await gh(`/repos/${repo}/issues/${pr}/comments`, token, { method: 'POST', body: JSON.stringify({ body }) });
  console.log(`Repo Roast: ${r.score}/10 posted to PR #${pr}`);
}
main().catch(e => { console.log(`::error::Repo Roast failed: ${e.message}`); process.exitCode = 1; });
