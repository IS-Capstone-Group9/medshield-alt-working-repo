import { CloudRain, Sun, CloudLightning, Thermometer } from 'lucide-react'
import { SeasonType } from '@/types/prescriptive.types'

interface SeasonGridProps {
  activeSeason: SeasonType
  onChangeSeason: (season: SeasonType) => void
}

export function SeasonGrid({ activeSeason, onChangeSeason }: SeasonGridProps) {
  const cards = [
    {
      id: 'amihan',
      tag: 'Nov - Feb',
      title: 'Amihan Cool Dry',
      risks: 'Flu/ILI Surges, Pediatric Asthma',
      restock: 'Bronchodilators, Antihistamines',
      rule: 'Regular base stock buffers active',
      icon: CloudRain,
      color: '#38BDF8',
    },
    {
      id: 'summer',
      tag: 'Mar & Apr',
      title: 'Summer Heat Surge',
      risks: 'Gastroenteritis, Dehydration, Typhoid',
      restock: 'ORS, GI Anti-Infectives, PPIs',
      rule: 'Dehydration stock adjustment active',
      icon: Sun,
      color: '#F59E0B',
    },
    {
      id: 'pre_monsoon',
      tag: 'May & Jun',
      title: 'Pre-Monsoon Storms',
      risks: 'Early Dengue, HFMD, GI outbreaks',
      restock: 'Non-NSAID Antipyretics, IV Fluids',
      rule: 'Initial safety buffer uplift active',
      icon: CloudLightning,
      color: '#34D399',
    },
    {
      id: 'monsoon',
      tag: 'Jul & Aug',
      title: 'Monsoon (Habagat)',
      risks: 'Dengue Outbreaks, Leptospirosis, Cholera',
      restock: 'Antipyretics, Doxycycline, IV Fluids',
      rule: 'Buffer: +45% Antipyretics, +40% Doxy, +35% IVF',
      icon: Thermometer,
      color: '#EF4444',
    },
  ] as const

  return (
    <div className="seasonal-grid">
      {cards.map((card) => {
        const Icon = card.icon
        const isActive = activeSeason === card.id
        return (
          <div
            key={card.id}
            className={`season-card clickable-season ${isActive ? 'active-season' : ''}`}
            onClick={() => onChangeSeason(card.id)}
            style={isActive ? { border: `2px solid ${card.color}`, background: `${card.color}15` } : {}}
          >
            <div className="season-card-tag" style={{ color: card.color }}>
              {card.tag}
            </div>
            <div className="season-card-title">
              <Icon size={14} className="inline-icon" style={{ color: card.color }} />
              {card.title}
            </div>
            <ul className="season-card-list">
              <li>
                <strong>Risks:</strong> {card.risks}
              </li>
              <li>
                <strong>Restock:</strong> {card.restock}
              </li>
              <li>
                <strong>Rule:</strong> {card.rule}
              </li>
            </ul>
            <div className="drilldown-prompt" style={{ color: card.color }}>
              View Reorder Plan
            </div>
          </div>
        )
      })}
    </div>
  )
}
