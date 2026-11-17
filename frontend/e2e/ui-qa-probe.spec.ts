import { test, expect, type Page } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { signInToReadyDashboard } from './helpers/dashboard'

/**
 * Read-only layout probe for a UI/UX review. It records geometry, type, chart and control
 * measurements for every dashboard page at several desktop widths, and changes nothing.
 * Live only: set MEDSHIELD_QA_OUT to a folder outside Git, because screenshots show client figures.
 */
const outputDirectory = process.env.MEDSHIELD_QA_OUT || ''
const widths = (process.env.MEDSHIELD_QA_WIDTHS || '1440,1024,1280,1920,768').split(',').map(Number)

async function measure(page: Page, id: string) {
  return page.evaluate((id) => {
    const active = document.querySelector<HTMLElement>('#page-' + id)!
    const content = document.querySelector<HTMLElement>('.content')!
    const px = (value: string) => Math.round(parseFloat(value) * 10) / 10 || 0
    const shown = (element: Element) => element.checkVisibility({ opacityProperty: true, visibilityProperty: true } as CheckVisibilityOptions)
      && element.getClientRects().length > 0
    const box = (element: Element) => {
      const r = element.getBoundingClientRect()
      return { x: Math.round(r.left), r: Math.round(r.right), y: Math.round(r.top + scrollY), b: Math.round(r.bottom + scrollY), w: Math.round(r.width), h: Math.round(r.height) }
    }
    const desc = (element: Element) => {
      const classes = typeof element.className === 'string' ? element.className.trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.') : ''
      return element.tagName.toLowerCase() + (element.id ? '#' + element.id : '') + (classes ? '.' + classes : '')
    }
    const textOf = (element: Element) => (element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60)
    const all = [...content.querySelectorAll<HTMLElement>('*')].filter(shown)

    // Cards: bordered or shadowed surfaces at least 200px wide.
    const isCard = (element: Element) => {
      const s = getComputedStyle(element)
      const b = element.getBoundingClientRect()
      const bordered = px(s.borderTopWidth) > 0 && s.borderTopStyle !== 'none' && px(s.borderTopLeftRadius) >= 4
      return b.width >= 200 && b.height >= 28 && (bordered || s.boxShadow !== 'none') && !['INPUT', 'SELECT', 'BUTTON', 'TABLE', 'TD', 'TH', 'TR', 'SUMMARY', 'A', 'LABEL'].includes(element.tagName)
    }
    const cards = all.filter(isCard)
    const depthOf = (element: Element) => { let d = 0; for (let n = element.parentElement; n && n !== content; n = n.parentElement) if (cards.includes(n as HTMLElement)) d++; return d }
    const cardRecords = cards.map(element => {
      const s = getComputedStyle(element)
      return { el: desc(element), depth: depthOf(element), ...box(element), pad: [px(s.paddingTop), px(s.paddingRight), px(s.paddingBottom), px(s.paddingLeft)], radius: px(s.borderTopLeftRadius), border: `${px(s.borderTopWidth)} ${s.borderTopColor}`, bg: s.backgroundColor, shadow: s.boxShadow === 'none' ? '' : s.boxShadow.slice(0, 60), mb: px(s.marginBottom), mt: px(s.marginTop) }
    }).filter(record => record.depth <= 2)
    const top = cardRecords.filter(record => record.depth === 0).sort((a, b) => a.y - b.y || a.x - b.x)
    const rows: typeof top[] = []
    for (const record of top) { const row = rows.find(r => Math.abs(r[0].y - record.y) < 6); if (row) row.push(record); else rows.push([record]) }
    const verticalGaps = rows.slice(1).map((row, index) => ({ after: rows[index][0].el, before: row[0].el, gap: row[0].y - Math.max(...rows[index].map(r => r.b)) }))
    const horizontalGutters = rows.filter(row => row.length > 1).map(row => ({ row: row.map(r => r.el.slice(0, 40)), gutters: row.slice(1).map((r, i) => r.x - row[i].r), heights: row.map(r => r.h), widths: row.map(r => r.w) }))

    // Bare text: visible blocks with their own text that sit outside every card.
    const bare = all.filter(element => !cards.some(card => card.contains(element)) && [...element.childNodes].some(node => node.nodeType === 3 && node.textContent!.trim().length > 2))
      .map(element => ({ el: desc(element), ...box(element), size: px(getComputedStyle(element).fontSize), text: textOf(element) })).slice(0, 25)

    // Controls.
    const meter = document.createElement('canvas').getContext('2d')!
    const controls = all.filter(element => element.matches('select,input:not([type=checkbox]):not([type=radio]):not([type=hidden]),button,[role=tab],summary')).map(element => {
      const s = getComputedStyle(element)
      let clipped: number | undefined
      if (element instanceof HTMLSelectElement && element.selectedOptions[0]) {
        meter.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`
        const need = meter.measureText(element.selectedOptions[0].textContent || '').width
        const room = element.clientWidth - px(s.paddingLeft) - px(s.paddingRight) - (s.appearance === 'none' ? 0 : 18)
        clipped = Math.round(need - room)
      }
      const b = box(element)
      return { el: desc(element), text: element instanceof HTMLSelectElement ? element.selectedOptions[0]?.textContent?.trim().slice(0, 40) : textOf(element), tag: element.tagName, x: b.x, y: b.y, w: b.w, h: b.h, size: px(s.fontSize), weight: s.fontWeight, radius: px(s.borderTopLeftRadius), border: `${px(s.borderTopWidth)} ${s.borderTopColor}`, bg: s.backgroundColor, padX: px(s.paddingLeft), appearance: s.appearance, clipped, disabled: (element as HTMLButtonElement).disabled || undefined, cursor: s.cursor }
    })

    // Tables.
    const range = document.createRange()
    const textBox = (cell: Element) => { range.selectNodeContents(cell); const r = range.getBoundingClientRect(); return { x: Math.round(r.left), r: Math.round(r.right) } }
    const tables = [...content.querySelectorAll('table')].filter(shown).map(table => {
      const heads = [...table.querySelectorAll('thead th')]
      const firstRow = table.querySelector('tbody tr')
      const cells = firstRow ? [...firstRow.children] : []
      const wrap = table.parentElement!
      return {
        el: desc(table), ...box(table), wrap: desc(wrap), wrapScroll: wrap.scrollWidth - wrap.clientWidth, wrapOverflowX: getComputedStyle(wrap).overflowX, bodyRows: table.querySelectorAll('tbody tr').length,
        rowH: firstRow ? Math.round(firstRow.getBoundingClientRect().height) : null,
        columns: heads.map((th, index) => {
          const td = cells[index]; const hs = getComputedStyle(th); const cs = td ? getComputedStyle(td) : null
          const ht = textBox(th); const ct = td ? textBox(td) : null
          return { head: textOf(th), headAlign: hs.textAlign, headSize: px(hs.fontSize), headLines: Math.round(th.getBoundingClientRect().height), cell: td ? textOf(td) : null, cellAlign: cs?.textAlign, cellSize: cs ? px(cs.fontSize) : null, numeric: td ? /^[₱\-−+]?\s?[\d,.]+\s?%?$/.test(textOf(td)) : null, tabular: cs?.fontVariantNumeric, padX: cs ? [px(cs.paddingLeft), px(cs.paddingRight)] : null, headX: ht, cellX: ct }
        }),
      }
    })

    // Charts.
    const ChartGlobal = (window as unknown as { Chart?: { getChart(canvas: HTMLCanvasElement): { config: { type: string; options: Record<string, any>; data: { datasets: unknown[] } }; chartArea: { left: number; right: number; top: number; bottom: number }; scales: Record<string, { ticks: unknown[]; options: Record<string, any> }> } | undefined } }).Chart
    const charts = [...active.querySelectorAll('canvas')].filter(shown).map(canvas => {
      const wrap = canvas.parentElement!; const ws = getComputedStyle(wrap); const before = getComputedStyle(wrap, '::before')
      const card = cards.find(c => c.contains(canvas) && depthOf(c) === 0)
      const chart = ChartGlobal?.getChart(canvas)
      const o = chart?.config.options
      return {
        el: desc(canvas), ...box(canvas), ratio: Math.round(canvas.getBoundingClientRect().width / canvas.getBoundingClientRect().height * 100) / 100,
        wrap: desc(wrap), wrapH: ws.height, wrapPad: [px(ws.paddingTop), px(ws.paddingRight), px(ws.paddingBottom), px(ws.paddingLeft)], wrapBg: ws.backgroundImage.slice(0, 90), wrapBorder: `${px(ws.borderTopWidth)} r${px(ws.borderTopLeftRadius)}`,
        before: before.content !== 'none' ? { bg: before.backgroundImage.slice(0, 110), animation: before.animationName, opacity: before.opacity, display: before.display } : null,
        card: card ? desc(card) : null, cardInsetX: card ? box(canvas).x - box(card).x : null,
        type: chart?.config.type, datasets: chart?.config.data.datasets.length, responsive: o?.responsive, maintainAspectRatio: o?.maintainAspectRatio, layoutPadding: o?.layout?.padding,
        legend: o?.plugins?.legend ? { display: o.plugins.legend.display, position: o.plugins.legend.position, pointStyle: o.plugins.legend.labels?.usePointStyle, font: o.plugins.legend.labels?.font?.size } : null,
        area: chart ? { l: Math.round(chart.chartArea.left), r: Math.round(canvas.getBoundingClientRect().width - chart.chartArea.right), t: Math.round(chart.chartArea.top), b: Math.round(canvas.getBoundingClientRect().height - chart.chartArea.bottom) } : null,
        scales: chart ? Object.fromEntries(Object.entries(chart.scales).map(([key, scale]) => [key, { ticks: scale.ticks.length, first: (scale.ticks[0] as { label?: string })?.label, last: (scale.ticks.at(-1) as { label?: string })?.label, font: scale.options.ticks?.font?.size, color: scale.options.ticks?.color, title: scale.options.title?.display ? `${scale.options.title.text} / ${scale.options.title.color}` : null, grid: scale.options.grid?.display, padding: scale.options.ticks?.padding, autoSkip: scale.options.ticks?.autoSkip, maxTicks: scale.options.ticks?.maxTicksLimit }])) : null,
      }
    })

    // KPI and metric tiles, grouped by parent.
    const tiles = all.filter(element => /(^|[\s-])(kpi|metric|stat|status)-?(card|tile|item)?(\s|$)/.test(String(element.className)) || element.matches('.kpi-card,.sales-status-card,.sales-computation-card,[class*="kpi-card"],[class*="metric-card"],[class*="-metric"]'))
    const tileGroups = [...new Set(tiles.map(tile => tile.parentElement!))].map(parent => {
      const members = tiles.filter(tile => tile.parentElement === parent)
      const ps = getComputedStyle(parent)
      return {
        parent: desc(parent), display: ps.display, columns: ps.gridTemplateColumns?.slice(0, 80), gap: `${ps.rowGap} ${ps.columnGap}`,
        tiles: members.map(tile => {
          const s = getComputedStyle(tile)
          const leaves = [...tile.querySelectorAll<HTMLElement>('*')].filter(node => shown(node) && [...node.childNodes].some(n => n.nodeType === 3 && n.textContent!.trim()))
          const value = leaves.slice().sort((a, b) => px(getComputedStyle(b).fontSize) - px(getComputedStyle(a).fontSize))[0]
          const vs = value ? getComputedStyle(value) : null
          return { el: desc(tile), ...box(tile), pad: [px(s.paddingTop), px(s.paddingRight), px(s.paddingBottom), px(s.paddingLeft)], border: px(s.borderTopWidth), radius: px(s.borderTopLeftRadius), value: value ? { el: desc(value), text: textOf(value), y: box(value).y, size: px(vs!.fontSize), weight: vs!.fontWeight, family: vs!.fontFamily.split(',')[0], tabular: vs!.fontVariantNumeric, lh: vs!.lineHeight } : null, label: leaves[0] ? { text: textOf(leaves[0]), size: px(getComputedStyle(leaves[0]).fontSize), transform: getComputedStyle(leaves[0]).textTransform, h: box(leaves[0]).h } : null }
        }),
      }
    }).filter(group => group.tiles.length > 1)

    // Type scale.
    const typed = all.filter(element => [...element.childNodes].some(node => node.nodeType === 3 && node.textContent!.trim()))
    const tally = (key: (s: CSSStyleDeclaration, e: HTMLElement) => string) => {
      const map = new Map<string, { n: number; eg: string }>()
      for (const element of typed) { const k = key(getComputedStyle(element), element); const entry = map.get(k) || { n: 0, eg: desc(element) }; entry.n++; map.set(k, entry) }
      return [...map].sort((a, b) => b[1].n - a[1].n).slice(0, 16).map(([k, v]) => `${k} ×${v.n} (${v.eg})`)
    }
    const headings = all.filter(element => element.matches('h1,h2,h3,h4,h5,[class*="title"]:not(svg *)')).filter(element => textOf(element)).map(element => { const s = getComputedStyle(element); return { el: desc(element), text: textOf(element).slice(0, 40), size: px(s.fontSize), weight: s.fontWeight, family: s.fontFamily.split(',')[0], x: box(element).x, y: box(element).y } }).slice(0, 30)
    const numericNoTabular = typed.filter(element => /^[₱\-−+]?\s?[\d,]+(\.\d+)?\s?%?$/.test(textOf(element)) && textOf(element).length > 3 && !/tabular/.test(getComputedStyle(element).fontVariantNumeric))
    const numericSummary = new Map<string, number>()
    for (const element of numericNoTabular) { const k = desc(element).replace(/#[\w-]+/, ''); numericSummary.set(k, (numericSummary.get(k) || 0) + 1) }

    // Gradients and pseudo-element overlays anywhere on screen.
    const gradients = [...document.querySelectorAll<HTMLElement>('body *')].filter(shown).flatMap(element => {
      const out: { el: string; where: string; bg: string; w: number; h: number; animation?: string }[] = []
      const b = element.getBoundingClientRect()
      for (const pseudo of ['', '::before', '::after']) {
        const s = getComputedStyle(element, pseudo || undefined)
        if (pseudo && s.content === 'none') continue
        if (s.backgroundImage.includes('gradient')) out.push({ el: desc(element), where: pseudo || 'self', bg: s.backgroundImage.slice(0, 100), w: Math.round(b.width), h: Math.round(b.height), animation: s.animationName !== 'none' ? s.animationName : undefined })
      }
      return out
    })
    const gradientSummary = new Map<string, { n: number; eg: (typeof gradients)[number] }>()
    for (const g of gradients) { const k = g.el.replace(/#[\w-]+/, '') + g.where; const entry = gradientSummary.get(k) || { n: 0, eg: g }; entry.n++; gradientSummary.set(k, entry) }

    // Overflow: content wider than the viewport, or text spilling out of its own box.
    const contentBox = content.getBoundingClientRect()
    const spill = all.filter(element => element.getBoundingClientRect().right > contentBox.right + 1 || element.getBoundingClientRect().left < contentBox.left - 1).map(element => ({ el: desc(element), ...box(element) })).slice(0, 12)
    const clippedText = all.filter(element => element.scrollWidth > element.clientWidth + 1 && ['hidden', 'clip'].includes(getComputedStyle(element).overflowX) && !element.matches('table,canvas') && element.clientWidth > 0 && textOf(element)).map(element => ({ el: desc(element), need: element.scrollWidth, room: element.clientWidth, text: textOf(element).slice(0, 40) })).slice(0, 12)
    const scrollers = all.filter(element => element.scrollWidth > element.clientWidth + 1 && ['auto', 'scroll'].includes(getComputedStyle(element).overflowX)).map(element => ({ el: desc(element), need: element.scrollWidth, room: element.clientWidth })).slice(0, 12)
    const cs = getComputedStyle(content)
    return {
      id, viewport: innerWidth, height: document.documentElement.scrollHeight, overflowX: document.documentElement.scrollWidth - innerWidth,
      content: { ...box(content), pad: [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)], maxWidth: cs.maxWidth },
      cardRecords, verticalGaps, horizontalGutters, bare, controls, tables, charts, tileGroups,
      fontSizes: tally(s => s.fontSize), lineHeights: tally(s => s.lineHeight === 'normal' ? 'normal' : String(Math.round(parseFloat(s.lineHeight) / parseFloat(s.fontSize) * 100) / 100)), families: tally(s => s.fontFamily.split(',')[0]), weights: tally(s => s.fontWeight),
      headings, numericNoTabular: [...numericSummary].sort((a, b) => b[1] - a[1]).slice(0, 15),
      gradients: [...gradientSummary.values()].map(v => ({ ...v.eg, count: v.n })), spill, clippedText, scrollers,
    }
  }, id)
}

async function interactionStates(page: Page, id: string) {
  const active = `#page-${id}`
  const targets = [
    ['nav item', '.nav-item:not(.active)'], ['primary button', `${active} .btn-primary, ${active} button.primary`], ['button', `.content button:not([disabled]):not([role=tab])`],
    ['tab', `${active} [role=tab][aria-selected=false]`], ['table row', `${active} tbody tr`], ['disclosure', `.content summary`], ['select', `.content select`], ['kpi card', `${active} .kpi-card`], ['link', `.content a[href]`],
  ] as const
  const read = (selector: string) => page.locator(selector).filter({ visible: true }).first().evaluate(element => {
    const s = getComputedStyle(element)
    return { bg: s.backgroundColor, color: s.color, border: s.borderTopColor, shadow: s.boxShadow, transform: s.transform, decoration: s.textDecorationLine, outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor} +${s.outlineOffset}`, cursor: s.cursor, transition: s.transitionDuration }
  })
  const results: Record<string, unknown> = {}
  for (const [name, selector] of targets) {
    const target = page.locator(selector).filter({ visible: true }).first()
    if (!await target.count()) { results[name] = 'absent'; continue }
    try {
      await target.scrollIntoViewIfNeeded({ timeout: 2000 })
      await page.mouse.move(0, 0)
      const rest = await read(selector)
      await target.hover({ timeout: 2000 })
      await page.waitForTimeout(260)
      const hover = await read(selector)
      await page.mouse.move(0, 0)
      await page.keyboard.press('Tab')
      await target.focus({ timeout: 2000 }).catch(() => undefined)
      await page.waitForTimeout(120)
      const focus = await read(selector)
      const focusVisible = await target.evaluate(element => element.matches(':focus-visible')).catch(() => false)
      const changed = (a: Record<string, string>, b: Record<string, string>) => Object.keys(a).filter(key => key !== 'outline' && a[key] !== b[key])
      results[name] = { hoverChanges: changed(rest, hover), cursor: hover.cursor, transition: rest.transition, focusVisible, focusOutline: focus.outline, focusShadowChanged: focus.shadow !== rest.shadow, focusBorderChanged: focus.border !== rest.border }
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    } catch (error) { results[name] = `error: ${String(error).slice(0, 80)}` }
  }
  return results
}

async function openPage(page: Page, id: string) {
  if ((page.viewportSize()?.width || 0) <= 1024 && await page.locator('.nav-toggle').getAttribute('aria-expanded') !== 'true') await page.locator('.nav-toggle').click()
  await page.locator(`[data-dashboard-page="${id}"]`).click()
  const active = page.locator(`#page-${id}`)
  await expect(active).toHaveClass(/active/)
  await expect.poll(() => active.locator('p, .skeleton, [aria-busy="true"]').evaluateAll(nodes => nodes.filter(node =>
    node.checkVisibility({ opacityProperty: true, visibilityProperty: true })
    && (node.matches('.skeleton, [aria-busy="true"]') || /^Loading[ .…]/i.test(node.textContent?.trim() || ''))).length), { timeout: 180000 }).toBe(0)
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  await page.waitForTimeout(1500)
}

test('layout probe records every page at desktop widths', async ({ page }) => {
  test.skip(!outputDirectory, 'Set MEDSHIELD_QA_OUT to a folder outside Git.')
  test.setTimeout(1800000)
  page.setDefaultTimeout(20000)
  const destination = path.resolve(outputDirectory)
  await mkdir(destination, { recursive: true })
  await page.setViewportSize({ width: 1440, height: 900 })
  await signInToReadyDashboard(page)
  const ids = await page.locator('[data-dashboard-page]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-dashboard-page')!))
  const records: Record<string, unknown> = {}
  for (const id of ids) {
    await page.setViewportSize({ width: 1440, height: 900 })
    await openPage(page, id)
    const states = await interactionStates(page, id)
    const perWidth: Record<string, unknown> = {}
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(900)
      perWidth[width] = await measure(page, id)
      await page.screenshot({ path: path.join(destination, `${id}-${width}.png`), fullPage: true })
      await page.screenshot({ path: path.join(destination, `${id}-${width}-fold.png`) })
    }
    records[id] = { states, widths: perWidth }
    await writeFile(path.join(destination, 'probe.json'), JSON.stringify(records, null, 1))
  }
})
