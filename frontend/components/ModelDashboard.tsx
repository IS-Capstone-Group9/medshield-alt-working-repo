'use client'

import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeasonEntry {
  months: string
  season_climate: string
  season_emoji: string
  urgency_level: number
  urgency_rating: string
  weather_indicators: string
  anticipated_outbreaks: string
  recommended_categories: string[]
  priority_medicines: string
  seasonal_index: Record<string, number | string>
  model_evidence: {
    model_used: string
    benchmark_mae?: number
    champion_mae?: number
    champion_rmse?: number
    correlation: string
    source_data: string
  }
  sources: { type: string; citation: string; url: string }[]
  status: string
}

interface ModelEntry {
  model_name: string
  model_code: string
  layer: string
  status: string
  mae?: number
  rmse?: number
  mape?: number
  note?: string
  output?: string
  monthly_indices?: { month: string; index: number }[]
  external_correlations?: Record<string, { r: number; p_value: string; interpretation: string }>
}

interface ModelSummary {
  methodology: { overall: string; data_period: string }
  descriptive: ModelEntry[]
  predictive: ModelEntry[]
  prescriptive: ModelEntry[]
  data_sources: { name: string; period: string; rows?: number; status: string }[]
}

interface McداEntry {
  territory: string
  abc_class: string
  revenue_share: number
  active_months: number
  revenue_score: number
  growth_score: number
  mcda_score: number
  priority_rank: number
  recommendation: string
}

interface McداResult {
  model_code: string
  status: string
  label: string
  weights: Record<string, number>
  weight_note: string
  territories: McداEntry[]
}

interface EoqEntry {
  category: string
  representative_sku: string
  annual_demand_units: number
  assumed_unit_cost_php: number
  eoq_units: number
  safety_stock_units: number
  reorder_point_units: number
  orders_per_year: number
}

interface EoqResult {
  model_code: string
  status: string
  label: string
  assumptions: Record<string, number>
  formula: string
  scenarios: EoqEntry[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const URGENCY_COLORS: Record<number, string> = {
  1: '#4FD1C8', 2: '#68D391', 3: '#F6AD55', 4: '#FC8181', 5: '#E53E3E',
}
const URGENCY_LABELS: Record<string, string> = {
  CRITICAL_EPIDEMIC_SURGE: '🔴 CRITICAL', HIGH_FLOOD_RISK: '🟠 HIGH',
  HIGH_RESPIRATORY_PRIORITY: '🟡 HIGH', PRE_MONSOON_PREPAREDNESS: '🟡 ELEVATED',
  SUMMER_GASTRO_PRIORITY: '🟢 MODERATE', HOLIDAY_RESPIRATORY_SURGE: '🟡 HIGH',
}
const SEASON_EMOJIS: Record<string, string> = {
  AMIHAN: '❄️', SUMMER: '☀️', PRE_MONSOON: '🌩️', HABAGAT: '🌧️', TYPHOON: '🌀', HOLIDAY: '🍂',
}
const STATUS_COLORS: Record<string, string> = {
  active: '#48BB78', benchmark: '#63B3ED', primary_chosen: '#4FD1C8',
  scenario: '#F6AD55', planned: '#9F7AEA', partial: '#F6AD55', blocked: '#FC8181',
}

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include' })
    if (!r.ok) return null
    return await r.json() as T
  } catch {
    return null
  }
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: '12px',
      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
      background: color + '22', color, border: `1px solid ${color}55`,
    }}>
      {label}
    </span>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: '#1CA4E8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        {subtitle}
      </div>
      <h2 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 800, color: '#1a3a52' }}>{title}</h2>
    </div>
  )
}

// ─── Season Card ──────────────────────────────────────────────────────────────

function SeasonCard({ entry }: { entry: SeasonEntry }) {
  const [open, setOpen] = useState(false)
  const color = URGENCY_COLORS[entry.urgency_level] ?? '#888'
  const emoji = SEASON_EMOJIS[entry.season_emoji] ?? '📅'

  // Extract seasonal index numbers
  const indexNums = Object.entries(entry.seasonal_index)
    .filter(([k]) => k !== 'interpretation' && k !== 'note')
    .map(([k, v]) => ({ month: k.charAt(0).toUpperCase() + k.slice(1), value: Number(v) }))

  return (
    <div style={{
      background: 'white', borderRadius: '14px', overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: `1px solid ${color}44`,
      borderTop: `4px solid ${color}`,
    }}>
      {/* Header */}
      <div style={{ padding: '16px 18px 12px', background: `linear-gradient(135deg, ${color}11, ${color}06)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '20px' }}>{emoji}</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#1a3a52', marginTop: '4px' }}>
              {entry.months}
            </div>
            <div style={{ fontSize: '11px', color: '#4a6fa5', marginTop: '2px' }}>{entry.season_climate}</div>
          </div>
          <Badge label={URGENCY_LABELS[entry.urgency_rating] ?? entry.urgency_rating} color={color} />
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '14px 18px' }}>
        {/* Seasonal Index row */}
        <div style={{
          display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px',
          padding: '8px', borderRadius: '8px', background: '#F7FAFC',
        }}>
          {indexNums.map(({ month, value }) => (
            <div key={month} style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '13px', fontWeight: 800,
                color: value >= 1.5 ? '#E53E3E' : value >= 1.0 ? '#DD6B20' : '#38A169',
              }}>{value.toFixed(2)}×</div>
              <div style={{ fontSize: '9px', color: '#718096', fontWeight: 600 }}>{month}</div>
            </div>
          ))}
          <div style={{ fontSize: '10px', color: '#718096', alignSelf: 'center', paddingLeft: '4px', flex: 1 }}>
            {String(entry.seasonal_index.note ?? '')}
          </div>
        </div>

        {/* Disease */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#E53E3E', textTransform: 'uppercase', marginBottom: '3px' }}>
            🦠 Disease Risk
          </div>
          <div style={{ fontSize: '12px', color: '#2D3748' }}>{entry.anticipated_outbreaks}</div>
        </div>

        {/* Medicine categories */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#2B6CB0', textTransform: 'uppercase', marginBottom: '4px' }}>
            💊 Restock Categories
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {entry.recommended_categories.map(cat => (
              <span key={cat} style={{
                fontSize: '10px', padding: '2px 7px', borderRadius: '10px',
                background: '#EBF8FF', color: '#2B6CB0', border: '1px solid #BEE3F8',
              }}>{cat}</span>
            ))}
          </div>
        </div>

        {/* Priority SKUs */}
        <div style={{ fontSize: '11px', color: '#553C9A', background: '#FAF5FF', padding: '6px 8px', borderRadius: '6px', marginBottom: '10px' }}>
          <strong>Priority SKUs:</strong> {entry.priority_medicines}
        </div>

        {/* Model evidence */}
        <div style={{ fontSize: '10px', color: '#4A5568', background: '#EDF2F7', padding: '6px 8px', borderRadius: '6px', marginBottom: '8px' }}>
          <strong style={{ color: '#2D3748' }}>🤖 Model:</strong> {entry.model_evidence.model_used}
          {entry.model_evidence.champion_mae && (
            <span style={{ marginLeft: '6px', color: '#4FD1C8' }}>
              MAE: {entry.model_evidence.champion_mae.toLocaleString()}
            </span>
          )}
          {entry.model_evidence.benchmark_mae && !entry.model_evidence.champion_mae && (
            <span style={{ marginLeft: '6px', color: '#718096' }}>
              Benchmark MAE: {entry.model_evidence.benchmark_mae.toLocaleString()}
            </span>
          )}
        </div>

        {/* Correlation */}
        <div style={{ fontSize: '10px', color: '#2F855A', background: '#F0FFF4', padding: '6px 8px', borderRadius: '6px', marginBottom: '10px' }}>
          <strong>📊 Correlation:</strong> {entry.model_evidence.correlation}
        </div>

        {/* Sources toggle */}
        <button
          onClick={() => setOpen(!open)}
          style={{
            width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #CBD5E0',
            background: '#F7FAFC', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#4A5568',
          }}
        >
          {open ? '▲ Hide Sources' : '▼ View Sources & Citations'}
        </button>
        {open && (
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {entry.sources.map((s, i) => (
              <div key={i} style={{ padding: '8px', borderRadius: '6px', background: s.type === 'Government' ? '#FFFAF0' : '#EBF8FF', fontSize: '10px', lineHeight: 1.5 }}>
                <Badge label={s.type} color={s.type === 'Government' ? '#D69E2E' : '#3182CE'} />
                <div style={{ marginTop: '4px', color: '#2D3748' }}>{s.citation}</div>
                <a href={s.url} target="_blank" rel="noreferrer" style={{ color: '#3182CE', wordBreak: 'break-all' }}>
                  {s.url}
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Model Summary Panel ──────────────────────────────────────────────────────

function ModelRow({ m }: { m: ModelEntry }) {
  const sc = STATUS_COLORS[m.status] ?? '#888'
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr auto auto auto',
      alignItems: 'center', gap: '12px', padding: '10px 14px',
      borderBottom: '1px solid #EDF2F7', fontSize: '12px',
    }}>
      <div>
        <div style={{ fontWeight: 700, color: '#1a3a52' }}>{m.model_name}</div>
        <div style={{ fontSize: '10px', color: '#718096', marginTop: '2px' }}>{m.note ?? m.output ?? ''}</div>
        {m.external_correlations && (
          <div style={{ fontSize: '10px', color: '#2F855A', marginTop: '2px' }}>
            {Object.entries(m.external_correlations).map(([k, v]) => (
              <span key={k} style={{ marginRight: '10px' }}>
                {k.replace(/_/g, ' ')}: r={v.r}, {v.p_value}
              </span>
            ))}
          </div>
        )}
        {m.monthly_indices && (
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
            {m.monthly_indices.map(idx => (
              <span key={idx.month} style={{
                fontSize: '10px', padding: '1px 5px', borderRadius: '4px',
                background: idx.index >= 1.5 ? '#FFF5F5' : idx.index >= 1.0 ? '#FFFAF0' : '#F0FFF4',
                color: idx.index >= 1.5 ? '#E53E3E' : idx.index >= 1.0 ? '#DD6B20' : '#38A169',
                fontWeight: 700,
              }}>
                {idx.month} {idx.index.toFixed(2)}×
              </span>
            ))}
          </div>
        )}
      </div>
      <Badge label={m.layer} color="#4A5568" />
      <Badge label={m.status.replace(/_/g, ' ')} color={sc} />
      {m.mae !== undefined ? (
        <div style={{ textAlign: 'right', fontSize: '11px' }}>
          <div style={{ color: '#2D3748', fontWeight: 700 }}>MAE {m.mae.toLocaleString()}</div>
          {m.rmse !== undefined && <div style={{ color: '#718096' }}>RMSE {m.rmse.toLocaleString()}</div>}
          {m.mape !== undefined && <div style={{ color: '#718096' }}>MAPE {m.mape.toFixed(1)}%</div>}
        </div>
      ) : <div />}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ModelDashboard() {
  const [matrix, setMatrix] = useState<SeasonEntry[]>([])
  const [summary, setSummary] = useState<ModelSummary | null>(null)
  const [mcda, setMcda] = useState<McداResult | null>(null)
  const [eoq, setEoq] = useState<EoqResult | null>(null)
  const [activeTab, setActiveTab] = useState<'seasonal' | 'models' | 'mcda' | 'eoq'>('seasonal')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch<SeasonEntry[]>('/api/seasonal_epidemic_matrix'),
      apiFetch<ModelSummary>('/api/model_summary'),
      apiFetch<McداResult>('/api/mcda_territories'),
      apiFetch<EoqResult>('/api/eoq_scenarios'),
    ]).then(([mat, sum, mc, eq]) => {
      if (mat) setMatrix(mat)
      if (sum) setSummary(sum)
      if (mc) setMcda(mc)
      if (eq) setEoq(eq)
      setLoading(false)
    })
  }, [])

  const tabStyle = (t: string) => ({
    padding: '8px 18px', borderRadius: '8px', border: 'none', cursor: 'pointer',
    fontSize: '12px', fontWeight: 700,
    background: activeTab === t ? '#1CA4E8' : 'transparent',
    color: activeTab === t ? 'white' : '#4A5568',
  })

  return (
    <div style={{ fontFamily: 'Inter, DM Sans, system-ui, sans-serif', color: '#2D3748' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0F2F43, #154562)',
        borderRadius: '16px', padding: '24px', marginBottom: '20px',
        color: 'white',
      }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#1CA4E8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          MedShield Decision Support System — Model Analytics
        </div>
        <h1 style={{ margin: '6px 0 8px', fontSize: '22px', fontWeight: 800 }}>
          📊 All Paper Models — Live Status Dashboard
        </h1>
        <p style={{ margin: 0, fontSize: '13px', color: '#D5E4EC', lineHeight: 1.6 }}>
          Every model used in the capstone paper is tracked here: Descriptive (ABC, Seasonality, YoY), Predictive (Seasonal Naive Benchmark, GBR/XGBoost), and Prescriptive (MCDA, EOQ/ROP, Seasonal Epidemic Matrix). All outputs labeled with status and data sources.
        </p>
        {summary && (
          <div style={{ display: 'flex', gap: '16px', marginTop: '14px', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 14px' }}>
              <div style={{ fontSize: '10px', color: '#AAD0DF' }}>Methodology</div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>{summary.methodology.overall}</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 14px' }}>
              <div style={{ fontSize: '10px', color: '#AAD0DF' }}>Data Period</div>
              <div style={{ fontSize: '13px', fontWeight: 700 }}>{summary.methodology.data_period}</div>
            </div>
            <div style={{ background: 'rgba(76,210,177,0.15)', borderRadius: '8px', padding: '8px 14px', border: '1px solid rgba(76,210,177,0.3)' }}>
              <div style={{ fontSize: '10px', color: '#4FD1C8' }}>Champion Model MAE</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#4FD1C8' }}>52,163 units</div>
            </div>
            <div style={{ background: 'rgba(246,173,85,0.15)', borderRadius: '8px', padding: '8px 14px', border: '1px solid rgba(246,173,85,0.3)' }}>
              <div style={{ fontSize: '10px', color: '#F6AD55' }}>Benchmark MAE</div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#F6AD55' }}>49,413 units</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', padding: '4px', background: '#EDF2F7', borderRadius: '12px', flexWrap: 'wrap' }}>
        {([
          ['seasonal', '🗓️ Seasonal Epidemic Matrix'],
          ['models', '🤖 All Models & Metrics'],
          ['mcda', '🏆 MCDA Territory Ranking'],
          ['eoq', '📦 EOQ / ROP Scenarios'],
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)} style={tabStyle(key)}>{label}</button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#718096' }}>Loading model data...</div>
      )}

      {/* ── Tab: Seasonal Matrix ── */}
      {!loading && activeTab === 'seasonal' && (
        <>
          <SectionHeader
            subtitle="Prescriptive Analytics — Seasonal Epidemic Matrix"
            title="Climate → Disease → Medicine Category Mapping"
          />
          <div style={{ fontSize: '12px', color: '#718096', marginBottom: '16px', padding: '10px', background: '#FFFAF0', borderRadius: '8px', borderLeft: '3px solid #F6AD55' }}>
            ⚠️ <strong>Status: DRAFT</strong> — Seasonal indices from MedShield computed sales data (2021-2025). Disease mappings backed by DOH PIDSR surveillance reports. All outputs require human review before procurement action.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
            {matrix.map((entry, i) => <SeasonCard key={i} entry={entry} />)}
          </div>
        </>
      )}

      {/* ── Tab: Models ── */}
      {!loading && activeTab === 'models' && summary && (
        <>
          <SectionHeader subtitle="CRISP-DM + SEMMA Methodology" title="All Model Status & Computed Metrics" />

          {/* Correlation callout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div style={{ background: '#F0FFF4', border: '1px solid #9AE6B4', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: '#2F855A', fontWeight: 700 }}>RAINFALL → LEPTOSPIROSIS</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#276749' }}>r = +0.548</div>
              <div style={{ fontSize: '10px', color: '#276749' }}>p &lt; 0.001 — Strong positive correlation</div>
            </div>
            <div style={{ background: '#EBF8FF', border: '1px solid #90CDF4', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: '#2B6CB0', fontWeight: 700 }}>RAINFALL → DENGUE</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#2C5282' }}>r = +0.429</div>
              <div style={{ fontSize: '10px', color: '#2C5282' }}>p &lt; 0.01 — Moderate positive correlation</div>
            </div>
            <div style={{ background: '#FFFAF0', border: '1px solid #FAF089', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: '#975A16', fontWeight: 700 }}>JUNE SEASONALITY INDEX</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#744210' }}>2.80×</div>
              <div style={{ fontSize: '10px', color: '#744210' }}>Highest demand month of the year</div>
            </div>
            <div style={{ background: '#FAF5FF', border: '1px solid #D6BCFA', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '10px', color: '#6B46C1', fontWeight: 700 }}>MAPE IMPROVEMENT</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#44337A' }}>1909% → 594%</div>
              <div style={{ fontSize: '10px', color: '#44337A' }}>Baseline vs. GBR+DOH+PAGASA Model</div>
            </div>
          </div>

          {['Descriptive', 'Predictive', 'Prescriptive'].map(layer => {
            const models = [
              ...(summary.descriptive || []),
              ...(summary.predictive || []),
              ...(summary.prescriptive || []),
            ].filter(m => m.layer === layer)
            return (
              <div key={layer} style={{ marginBottom: '20px', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
                <div style={{ padding: '12px 16px', background: '#F7FAFC', borderBottom: '1px solid #EDF2F7', fontWeight: 700, color: '#1a3a52', fontSize: '13px' }}>
                  {layer === 'Descriptive' ? '📊' : layer === 'Predictive' ? '🔮' : '🎯'} {layer} Analytics
                </div>
                {models.map((m, i) => <ModelRow key={i} m={m} />)}
              </div>
            )
          })}

          {/* Data sources */}
          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
            <div style={{ padding: '12px 16px', background: '#F7FAFC', borderBottom: '1px solid #EDF2F7', fontWeight: 700, color: '#1a3a52', fontSize: '13px' }}>
              📁 Data Sources
            </div>
            {summary.data_sources.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #EDF2F7', fontSize: '12px' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#2D3748' }}>{s.name}</div>
                  <div style={{ color: '#718096', fontSize: '11px' }}>{s.period}{s.rows ? ` — ${s.rows.toLocaleString()} rows` : ''}</div>
                </div>
                <Badge label={s.status.replace(/_/g, ' ')} color={s.status === 'active' ? '#38A169' : '#D69E2E'} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Tab: MCDA ── */}
      {!loading && activeTab === 'mcda' && mcda && (
        <>
          <SectionHeader subtitle="Prescriptive Analytics — MCDA" title="Territory Priority Ranking" />
          <div style={{ background: '#FFFAF0', border: '1px solid #FAD08A', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px' }}>
            <strong>⚠️ {mcda.label}</strong><br />
            Weights: Revenue {(mcda.weights.revenue * 100).toFixed(0)}% + Growth {(mcda.weights.growth * 100).toFixed(0)}%.<br />
            <span style={{ color: '#744210' }}>{mcda.weight_note}</span>
          </div>
          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px 80px 80px 80px', padding: '10px 16px', background: '#F7FAFC', borderBottom: '1px solid #EDF2F7', fontSize: '11px', fontWeight: 700, color: '#718096', textTransform: 'uppercase' }}>
              <div>#</div><div>Territory</div><div>Class</div><div>Revenue</div><div>Growth</div><div>MCDA Score</div><div>Months</div>
            </div>
            {mcda.territories.map(t => (
              <div key={t.territory} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 80px 80px 80px 80px', padding: '12px 16px', borderBottom: '1px solid #EDF2F7', fontSize: '12px', alignItems: 'center' }}>
                <div style={{ fontWeight: 800, color: t.priority_rank <= 2 ? '#1CA4E8' : '#718096' }}>#{t.priority_rank}</div>
                <div>
                  <div style={{ fontWeight: 700, color: '#2D3748' }}>{t.territory}</div>
                  <div style={{ fontSize: '10px', color: '#718096' }}>{t.recommendation}</div>
                </div>
                <Badge label={t.abc_class} color={t.abc_class === 'A' ? '#38A169' : '#DD6B20'} />
                <div style={{ fontWeight: 700, color: '#2D3748' }}>{(t.revenue_share * 100).toFixed(1)}%</div>
                <div style={{ color: '#2D3748' }}>{t.growth_score.toFixed(0)}</div>
                <div style={{ fontWeight: 800, color: '#1CA4E8', fontSize: '14px' }}>{t.mcda_score.toFixed(1)}</div>
                <div style={{ color: '#718096' }}>{t.active_months}mo</div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Tab: EOQ ── */}
      {!loading && activeTab === 'eoq' && eoq && (
        <>
          <SectionHeader subtitle="Prescriptive Analytics — EOQ / ROP / Safety Stock" title="Inventory Scenario Formulas" />
          <div style={{ background: '#FFFAF0', border: '1px solid #FAD08A', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '12px' }}>
            <strong>⚠️ {eoq.label}</strong>
          </div>
          <div style={{ background: '#F0FFF4', border: '1px solid #9AE6B4', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '11px', fontFamily: 'monospace', color: '#276749' }}>
            {eoq.formula} | Ordering cost: ₱{eoq.assumptions.ordering_cost_php}/order, Holding: {(eoq.assumptions.holding_cost_pct * 100).toFixed(0)}%/yr, Lead time: {eoq.assumptions.lead_time_days}d, Service level: {eoq.assumptions.service_level_pct}%
          </div>
          <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.07)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 80px 80px 80px', padding: '10px 16px', background: '#F7FAFC', borderBottom: '1px solid #EDF2F7', fontSize: '11px', fontWeight: 700, color: '#718096', textTransform: 'uppercase' }}>
              <div>Category / SKU</div><div>Annual Demand</div><div>EOQ</div><div>Safety Stock</div><div>ROP</div><div>Orders/yr</div>
            </div>
            {eoq.scenarios.map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px 80px 80px 80px', padding: '12px 16px', borderBottom: '1px solid #EDF2F7', fontSize: '12px', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#2D3748' }}>{s.category}</div>
                  <div style={{ fontSize: '10px', color: '#718096' }}>{s.representative_sku} — ₱{s.assumed_unit_cost_php.toFixed(2)}/unit</div>
                </div>
                <div style={{ color: '#2D3748' }}>{s.annual_demand_units.toLocaleString()}</div>
                <div style={{ fontWeight: 700, color: '#2B6CB0' }}>{s.eoq_units.toLocaleString()}</div>
                <div style={{ fontWeight: 700, color: '#D69E2E' }}>{s.safety_stock_units.toLocaleString()}</div>
                <div style={{ fontWeight: 700, color: '#E53E3E' }}>{s.reorder_point_units.toLocaleString()}</div>
                <div style={{ color: '#718096' }}>{s.orders_per_year}x</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
