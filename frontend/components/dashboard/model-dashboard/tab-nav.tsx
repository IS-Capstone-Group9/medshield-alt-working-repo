interface TabNavProps {
  activeTab: 'seasonal' | 'models' | 'mcda' | 'eoq'
  onChangeTab: (tab: 'seasonal' | 'models' | 'mcda' | 'eoq') => void
}

export function TabNav({ activeTab, onChangeTab }: TabNavProps) {
  const tabs = [
    { id: 'seasonal', label: 'Climate Seasons Mapping' },
    { id: 'models', label: 'Model Readiness & Ingestion' },
    { id: 'mcda', label: 'MCDA Priority Segment' },
    { id: 'eoq', label: 'Continuous EOQ Plan' },
  ] as const

  return (
    <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #EDF2F7', marginBottom: '20px', paddingBottom: '2px' }}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            style={{
              padding: '8px 16px',
              background: isActive ? '#EBF8FF' : 'transparent',
              border: 'none',
              borderBottom: isActive ? '3px solid #3182CE' : '3px solid transparent',
              color: isActive ? '#2B6CB0' : '#4A5568',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
