export function LoginFeatures() {
  const items = [
    {
      title: 'Descriptive Analytics',
      desc: 'Real-time sales aggregation and Pareto ranking across client networks.',
    },
    {
      title: 'Predictive Modeling',
      desc: 'Prophet 2026 demand forecasting using DOH surveillance and PAGASA climate parameters.',
    },
    {
      title: 'Prescriptive Planning',
      desc: 'Adaptive safety stock buffers and MCDA prioritization using WHO therapeutic mappings.',
    },
  ]

  return (
    <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px' }}>
      {items.map((item, idx) => (
        <li key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '13px', color: '#E2E8F0', lineHeight: 1.4 }}>
          <span style={{ color: '#38BDF8', fontWeight: 'bold' }}>✓</span>
          <span>
            <strong>{item.title}:</strong> {item.desc}
          </span>
        </li>
      ))}
    </ul>
  )
}
