'use client'

import { useEffect, useState } from 'react'
import { API_BASE_URL } from '@/lib/api'
import { TabNav } from './dashboard/model-dashboard/tab-nav'
import { SeasonCard } from './dashboard/model-dashboard/season-card'
import { ModelReadiness } from './dashboard/model-dashboard/model-readiness'
import { McdaRanking } from './dashboard/model-dashboard/mcda-ranking'
import { EoqScenarios } from './dashboard/model-dashboard/eoq-scenarios'
import { ModelSummary } from './dashboard/model-dashboard/types'

async function apiFetch<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include' })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  }
}

export default function ModelDashboard() {
  const [matrix, setMatrix] = useState<any[]>([])
  const [summary, setSummary] = useState<ModelSummary | null>(null)
  const [mcda, setMcda] = useState<any>(null)
  const [eoq, setEoq] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'seasonal' | 'models' | 'mcda' | 'eoq'>('seasonal')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      apiFetch<any[]>('/api/seasonal_epidemic_matrix'),
      apiFetch<ModelSummary>('/api/model_summary'),
      apiFetch<any>('/api/mcda_territories'),
      apiFetch<any>('/api/eoq_scenarios'),
    ]).then(([mat, sum, mc, eq]) => {
      if (mat) setMatrix(mat)
      if (sum) setSummary(sum)
      if (mc) setMcda(mc)
      if (eq) setEoq(eq)
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontSize: '13px', color: '#718096', fontWeight: 600 }}>
        Loading Prescriptive Models...
      </div>
    )
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#3182CE', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Decision Support System Layer
        </div>
        <h2 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 800, color: '#1A3A52' }}>
          Climate-Disease Outbreak Optimization &amp; Safety Stocks
        </h2>
      </div>

      <TabNav activeTab={activeTab} onChangeTab={setActiveTab} />

      <div style={{ marginTop: '16px' }}>
        {activeTab === 'seasonal' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {matrix.map((entry, idx) => (
              <SeasonCard key={idx} entry={entry} />
            ))}
          </div>
        )}
        {activeTab === 'models' && <ModelReadiness summary={summary} />}
        {activeTab === 'mcda' && <McdaRanking mcda={mcda} />}
        {activeTab === 'eoq' && <EoqScenarios eoq={eoq} />}
      </div>
    </div>
  )
}
