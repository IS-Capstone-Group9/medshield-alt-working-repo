import {authenticatedJson, getJson} from './api-client'
import {PANEL_CSS, esc, onPageOpen} from './panel-kit'

type Questions = {sus: string[]; usefulness: string[]; roles: string[]}
const ROLE_LABEL: Record<string, string> = {owner_or_manager: 'Owner or manager', purchasing_or_inventory: 'Purchasing or inventory', sales: 'Sales', pharmacist: 'Pharmacist', other: 'Other'}
const SCALE = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree']

/** Data Source page: client acceptance survey (SUS + usefulness), saved as an audit event through the gateway. */
export function installAcceptanceSurveyPanel(root: HTMLElement) {
  const host = root.querySelector<HTMLElement>('#page-data')
  if (!host) return () => {}
  const panel = document.createElement('section')
  panel.className = 'chart-card'; panel.id = 'acceptanceSurvey'
  panel.innerHTML = `<style>${PANEL_CSS('acceptanceSurvey')}
    #acceptanceSurvey fieldset{border:1px solid var(--border);border-radius:var(--radius-card);padding:var(--space-3) var(--space-4);margin:var(--space-2) 0;min-width:0}
    #acceptanceSurvey legend{font-size:13px;font-weight:600;padding:0 4px;color:var(--text-primary)}
    #acceptanceSurvey .sv-q{padding:var(--space-2) 0;border-bottom:1px solid var(--border)}#acceptanceSurvey .sv-q:last-child{border-bottom:0}
    #acceptanceSurvey .sv-q p{margin:0 0 6px;font-size:13px}
    #acceptanceSurvey .sv-scale{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}
    #acceptanceSurvey .sv-scale label{display:grid;justify-items:center;gap:2px;font-size:11px;color:var(--text-secondary);text-align:center;padding:4px 2px;border:1px solid var(--border);border-radius:6px;cursor:pointer}
    #acceptanceSurvey .sv-scale label:has(input:checked){border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,transparent);color:var(--text-primary);font-weight:600}
    #acceptanceSurvey .sv-progress{height:6px;border-radius:3px;background:color-mix(in srgb,var(--text-secondary) 12%,transparent);overflow:hidden;margin:var(--space-2) 0}
    #acceptanceSurvey .sv-progress span{display:block;height:100%;background:var(--accent);transition:width .2s}
    #acceptanceSurvey .sv-actions{display:flex;flex-wrap:wrap;gap:var(--space-3);align-items:center;margin-top:var(--space-3)}
    #acceptanceSurvey .sv-done{padding:var(--space-3) var(--space-4);border-radius:var(--radius-card);border:1px solid color-mix(in srgb,#2f7d5b 45%,transparent);background:color-mix(in srgb,#2f7d5b 8%,transparent)}
    @media(max-width:650px){#acceptanceSurvey .sv-scale label{font-size:10px}}
    @media(prefers-reduced-motion:reduce){#acceptanceSurvey .sv-progress span{transition:none}}</style>
    <h2 class="chart-title">Client feedback survey</h2>
    <p class="pk-lead">Takes about 3 minutes after the walkthrough. Answers are saved with your login as an audit record and used to evaluate the system (System Usability Scale plus three usefulness questions).</p>
    <p id="acceptanceSurveyStatus" role="status">Open Data Source to load the survey.</p>
    <form id="acceptanceSurveyForm" hidden novalidate>
      <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:inline-grid;gap:4px">Your role<select id="acceptanceSurveyRole" required><option value="">Choose…</option></select></label>
      <div class="sv-progress" aria-hidden="true"><span id="acceptanceSurveyBar" style="width:0"></span></div>
      <p class="pk-lead" id="acceptanceSurveyCount" aria-live="polite"></p>
      <fieldset><legend>Ease of use</legend><div id="acceptanceSurveySus"></div></fieldset>
      <fieldset><legend>Usefulness for MedShield</legend><div id="acceptanceSurveyUse"></div></fieldset>
      <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:grid;gap:4px">Anything to improve? (optional)<textarea id="acceptanceSurveyComment" rows="3" maxlength="1000"></textarea></label>
      <div class="sv-actions"><button type="submit" class="btn btn-primary" id="acceptanceSurveySubmit" disabled>Submit feedback</button><span id="acceptanceSurveyError" role="alert" style="color:#b23b3b;font-size:13px"></span></div>
    </form>
    <div id="acceptanceSurveyDone" class="sv-done" hidden></div>`
  host.append(panel)
  const el = <T extends HTMLElement = HTMLElement>(id: string) => panel.querySelector<T>('#acceptanceSurvey' + id)!
  const form = el<HTMLFormElement>('Form'), role = el<HTMLSelectElement>('Role')
  let q: Questions | null = null, loaded = false, disposed = false, controller: AbortController | null = null
  const block = (prefix: string, items: string[]) => items.map((text, i) => `<div class="sv-q" role="radiogroup" aria-labelledby="${prefix}${i}l"><p id="${prefix}${i}l">${i + 1}. ${esc(text)}</p><div class="sv-scale">${SCALE.map((s, k) =>
    `<label><input type="radio" name="${prefix}${i}" value="${k + 1}"><span>${k + 1}</span><span>${s}</span></label>`).join('')}</div></div>`).join('')
  const answers = (prefix: string, n: number) => Array.from({length: n}, (_, i) => Number((form.querySelector<HTMLInputElement>(`input[name="${prefix}${i}"]:checked`))?.value ?? 0))
  const progress = () => {
    if (!q) return
    const all = [...answers('sus', q.sus.length), ...answers('use', q.usefulness.length)], done = all.filter(Boolean).length + (role.value ? 1 : 0), total = all.length + 1
    el('Bar').style.width = `${(100 * done / total).toFixed(0)}%`
    el('Count').textContent = `${done} of ${total} answered`
    el<HTMLButtonElement>('Submit').disabled = done < total
  }
  const render = (v: Questions) => {
    q = v
    role.innerHTML = '<option value="">Choose…</option>' + v.roles.map(r => `<option value="${r}">${ROLE_LABEL[r] ?? r}</option>`).join('')
    el('Sus').innerHTML = block('sus', v.sus); el('Use').innerHTML = block('use', v.usefulness)
    form.hidden = false; el('Status').hidden = true; progress()
  }
  form.addEventListener('change', progress)
  form.addEventListener('submit', async e => {
    e.preventDefault(); if (!q) return
    const submit = el<HTMLButtonElement>('Submit'); submit.disabled = true; el('Error').textContent = ''
    try {
      const out = await authenticatedJson<{saved: boolean; sus_score: number}>('/api/acceptance/survey', {method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({sus: answers('sus', q.sus.length), usefulness: answers('use', q.usefulness.length), role: role.value, comment: el<HTMLTextAreaElement>('Comment').value})})
      form.hidden = true; el('Done').hidden = false
      el('Done').innerHTML = `<strong>Thank you, your feedback was saved.</strong><p class="pk-lead">Your usability score: ${out.sus_score.toFixed(1)} out of 100 (68 is the usual average).</p><button type="button" class="btn btn-secondary" id="acceptanceSurveyAgain">Another person will answer</button>`
      el('Again').addEventListener('click', () => { form.reset(); el('Done').hidden = true; form.hidden = false; progress() })
    } catch { el('Error').textContent = 'Could not save. Please try again.'; submit.disabled = false }
  })
  const load = async () => {
    if (disposed || loaded) return
    loaded = true; controller = new AbortController(); el('Status').hidden = false; el('Status').textContent = 'Loading the survey…'
    try { const v = await getJson<Questions>('/api/acceptance/survey/questions', {signal: controller.signal}); if (!disposed) render(v) }
    catch { if (disposed || controller.signal.aborted) return; loaded = false; el('Status').textContent = 'Survey unavailable. Please try again.' }
  }
  const off = onPageOpen(root, host, 'data', () => void load())
  return () => { disposed = true; controller?.abort(); off(); panel.remove() }
}
