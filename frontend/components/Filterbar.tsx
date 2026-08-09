"use client"

import { useDashboard } from '../lib/dashboardContext'

export default function Filterbar() {
  const { selectedYear, setSelectedYear } = useDashboard()
  const years = ['2025', '2024', '2023', '2022', '2021', '2020', '2019', '2018', '2017']

  return (
    <div className="filterbar" id="filterBar">
      <div className="filterbar-main">
        <div className="filterbar-label">Comparison</div>
        <div className="comparison-selector">
          <button className="comp-mode-btn active">Single Year</button>
          <button className="comp-mode-btn">Y/Y Compare</button>
          <button className="comp-mode-btn">Custom</button>
        </div>
        <div className="year-selector" id="yearSelector">
          {years.map((y) => (
            <button
              key={y}
              className={`yr-btn ${selectedYear === y ? 'active' : ''}`}
              onClick={() => setSelectedYear(selectedYear === y ? null : y)}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
      <div className="filterbar-note">Showing dataset: <strong>Sales Report</strong></div>
    </div>
  )
}
