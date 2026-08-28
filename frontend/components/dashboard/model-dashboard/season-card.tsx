import { useState } from 'react'

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

const URGENCY_COLORS: Record<number, string> = {
  1: '#4FD1C8', 2: '#68D391', 3: '#F6AD55', 4: '#FC8181', 5: '#E53E3E',
}
const URGENCY_LABELS: Record<string, string> = {
  CRITICAL_EPIDEMIC_SURGE: 'CRITICAL', HIGH_FLOOD_RISK: 'HIGH',
  HIGH_RESPIRATORY_PRIORITY: 'HIGH', PRE_MONSOON_PREPAREDNESS: 'ELEVATED',
  SUMMER_GASTRO_PRIORITY: 'MODERATE', HOLIDAY_RESPIRATORY_SURGE: 'HIGH',
}
const SEASON_EMOJIS: Record<string, string> = {
  AMIHAN: 'Amihan', SUMMER: 'Summer', PRE_MONSOON: 'Pre-Monsoon', HABAGAT: 'Habagat', TYPHOON: 'Typhoon', HOLIDAY: 'Holiday',
}

export function SeasonCard({ entry }: { entry: SeasonEntry }) {
  const [open, setOpen] = useState(false)
  const color = URGENCY_COLORS[entry.urgency_level] ?? '#888'
  const emoji = SEASON_EMOJIS[entry.season_emoji] ?? '📅'

  const indexNums = Object.entries(entry.seasonal_index)
    .filter(([k]) => k !== 'interpretation' && k !== 'note')
    .map(([k, v]) => ({ month: k.charAt(0).toUpperCase() + k.slice(1), value: Number(v) }))

  return (
    <div style={{
      background: 'white', borderRadius: '14px', overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: `1px solid ${color}44`,
      borderTop: `4px solid ${color}`,
    }}>
      <div style={{ padding: '16px 18px 12px', background: `linear-gradient(135deg, ${color}11, ${color}06)` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '20px' }}>{emoji}</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#1a3a52', marginTop: '4px' }}>{entry.months}</div>
            <div style={{ fontSize: '11px', color: '#4a6fa5', marginTop: '2px' }}>{entry.season_climate}</div>
          </div>
          <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', color, background: `${color}22`, fontWeight: 700 }}>
            {URGENCY_LABELS[entry.urgency_rating] ?? entry.urgency_rating}
          </span>
        </div>
      </div>

      <div style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px', padding: '8px', borderRadius: '8px', background: '#F7FAFC' }}>
          {indexNums.map(({ month, value }) => (
            <div key={month} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: value >= 1.5 ? '#E53E3E' : value >= 1.0 ? '#DD6B20' : '#38A169' }}>
                {value.toFixed(2)}×
              </div>
              <div style={{ fontSize: '9px', color: '#718096', fontWeight: 600 }}>{month}</div>
            </div>
          ))}
          <div style={{ fontSize: '10px', color: '#718096', alignSelf: 'center', paddingLeft: '4px', flex: 1 }}>
            {String(entry.seasonal_index.note ?? '')}
          </div>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#E53E3E', textTransform: 'uppercase', marginBottom: '3px' }}>🦠 Disease Risk</div>
          <div style={{ fontSize: '12px', color: '#2D3748' }}>{entry.anticipated_outbreaks}</div>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#2B6CB0', textTransform: 'uppercase', marginBottom: '4px' }}>💊 Restock Categories</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {entry.recommended_categories.map(cat => (
              <span key={cat} style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '10px', background: '#EBF8FF', color: '#2B6CB0', border: '1px solid #BEE3F8' }}>{cat}</span>
            ))}
          </div>
        </div>

        <div style={{ fontSize: '11px', color: '#553C9A', background: '#FAF5FF', padding: '6px 8px', borderRadius: '6px', marginBottom: '10px' }}>
          <strong>Priority SKUs:</strong> {entry.priority_medicines}
        </div>

        <div style={{ fontSize: '10px', color: '#4A5568', background: '#EDF2F7', padding: '6px 8px', borderRadius: '6px', marginBottom: '8px' }}>
          <strong style={{ color: '#2D3748' }}>🤖 Model:</strong> {entry.model_evidence.model_used}
          {entry.model_evidence.champion_mae && <span style={{ marginLeft: '6px', color: '#4FD1C8' }}>MAE: {entry.model_evidence.champion_mae.toLocaleString()}</span>}
        </div>

        <button onClick={() => setOpen(!open)} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #CBD5E0', background: '#F7FAFC', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: '#4A5568' }}>
          {open ? '▲ Hide Sources' : '▼ View Sources & Citations'}
        </button>
        {open && (
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {entry.sources.map((s, i) => (
              <div key={i} style={{ padding: '8px', borderRadius: '6px', background: s.type === 'Government' ? '#FFFAF0' : '#EBF8FF', fontSize: '10px', lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700, color: s.type === 'Government' ? '#D69E2E' : '#3182CE' }}>{s.type} Source</div>
                <div style={{ marginTop: '4px', color: '#2D3748' }}>{s.citation}</div>
                <a href={s.url} target="_blank" rel="noreferrer" style={{ color: '#3182CE', wordBreak: 'break-all' }}>{s.url}</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
