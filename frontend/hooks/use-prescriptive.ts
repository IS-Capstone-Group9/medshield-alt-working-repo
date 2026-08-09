import { useState } from 'react'
import { SeasonType, SeasonInfo, RestockItem } from '@/types/prescriptive.types'

const SEASONS_DATA: Record<SeasonType, { info: SeasonInfo; rows: RestockItem[] }> = {
  amihan: {
    info: {
      tag: 'Jan & Feb',
      title: 'Amihan Cool Dry',
      risks: 'Flu/ILI Surges, Pediatric Asthma',
      restock: 'Bronchodilators, Antihistamines',
      priority: 'Inhaled Bronchodilators, Antihistamines',
      rule: 'Regular base stock buffers active',
    },
    rows: [
      { category: 'Inhaled Bronchodilators', surgeBuffer: '+20%', currentStock: '8,400', recommendedEoq: '12,000', reorderPoint: '6,500', urgency: 'STABLE', unitCost: '₱145.00' },
      { category: 'Antihistamines', surgeBuffer: '+20%', currentStock: '15,200', recommendedEoq: '20,000', reorderPoint: '11,000', urgency: 'STABLE', unitCost: '₱35.00' },
    ],
  },
  summer: {
    info: {
      tag: 'Mar & Apr',
      title: 'Summer Heat Surge',
      risks: 'Gastroenteritis, Dehydration, Typhoid',
      restock: 'ORS, GI Anti-Infectives, PPIs',
      priority: 'ORS, GI Anti-Infectives',
      rule: 'Dehydration stock adjustment active',
    },
    rows: [
      { category: 'Oral Rehydration Salts (ORS)', surgeBuffer: '+25%', currentStock: '4,100', recommendedEoq: '15,000', reorderPoint: '6,000', urgency: 'WARNING', unitCost: '₱12.50' },
      { category: 'GI Anti-Infectives', surgeBuffer: '+25%', currentStock: '2,200', recommendedEoq: '8,000', reorderPoint: '3,500', urgency: 'WARNING', unitCost: '₱85.00' },
    ],
  },
  pre_monsoon: {
    info: {
      tag: 'May & Jun',
      title: 'Pre-Monsoon Storms',
      risks: 'Early Dengue, HFMD, GI outbreaks',
      restock: 'Non-NSAID Antipyretics, IV Fluids',
      priority: 'Non-NSAID Antipyretics, IV Fluids',
      rule: 'Initial safety buffer uplift active',
    },
    rows: [
      { category: 'Systemic Antipyretics (Non-NSAID)', surgeBuffer: '+30%', currentStock: '7,500', recommendedEoq: '18,000', reorderPoint: '9,000', urgency: 'WARNING', unitCost: '₱25.00' },
      { category: 'IV Fluids (0.9% NaCl)', surgeBuffer: '+30%', currentStock: '3,400', recommendedEoq: '10,000', reorderPoint: '5,000', urgency: 'WARNING', unitCost: '₱65.00' },
    ],
  },
  monsoon: {
    info: {
      tag: 'Jul & Aug',
      title: 'Monsoon (Habagat)',
      risks: 'Dengue Outbreaks, Leptospirosis, Cholera',
      restock: 'Antipyretics, Doxycycline, IV Fluids',
      priority: 'Non-NSAID Antipyretics, Doxycycline',
      rule: 'Buffer: +45% Antipyretics, +40% Doxy, +35% IVF',
    },
    rows: [
      { category: 'Systemic Antipyretics (Non-NSAID)', surgeBuffer: '+45% (NSAID Contraindicated)', currentStock: '1,800', recommendedEoq: '25,000', reorderPoint: '12,000', urgency: 'CRITICAL', unitCost: '₱25.00' },
      { category: 'Doxycycline (Flood Prophylaxis)', surgeBuffer: '+40%', currentStock: '800', recommendedEoq: '12,000', reorderPoint: '4,500', urgency: 'CRITICAL', unitCost: '₱48.00' },
      { category: 'IV Fluids (0.9% NaCl)', surgeBuffer: '+35%', currentStock: '1,200', recommendedEoq: '15,000', reorderPoint: '7,000', urgency: 'CRITICAL', unitCost: '₱65.00' },
    ],
  },
  typhoon: {
    info: {
      tag: 'Sep & Oct',
      title: 'Late Typhoon & Post-Flood Siltation',
      risks: 'Leptospirosis Wave 2, Dengue, Typhoid',
      restock: 'Anti-Leptospiral, GI Meds, ORS',
      priority: 'Doxycycline, GI Anti-Infectives, ORS',
      rule: 'Late typhoon response buffers active',
    },
    rows: [
      { category: 'Doxycycline (Flood Prophylaxis)', surgeBuffer: '+35%', currentStock: '3,000', recommendedEoq: '10,000', reorderPoint: '5,000', urgency: 'WARNING', unitCost: '₱48.00' },
      { category: 'Oral Rehydration Salts (ORS)', surgeBuffer: '+30%', currentStock: '2,800', recommendedEoq: '12,000', reorderPoint: '4,500', urgency: 'WARNING', unitCost: '₱12.50' },
    ],
  },
  holiday: {
    info: {
      tag: 'Nov & Dec',
      title: 'Cold Front & Holiday Surge',
      risks: 'Flu/ILI Surge, Pediatric Asthma',
      restock: 'Bronchodilators, Mucolytics, Antibiotics',
      priority: 'Bronchodilators, Antihistamines',
      rule: 'Holiday surge respiratory buffers active',
    },
    rows: [
      { category: 'Inhaled Bronchodilators', surgeBuffer: '+25%', currentStock: '6,200', recommendedEoq: '12,000', reorderPoint: '5,500', urgency: 'STABLE', unitCost: '₱145.00' },
      { category: 'Mucolytics', surgeBuffer: '+20%', currentStock: '11,400', recommendedEoq: '15,000', reorderPoint: '8,000', urgency: 'STABLE', unitCost: '₱18.00' },
    ],
  },
}

export function usePrescriptive() {
  const [activeSeason, setActiveSeason] = useState<SeasonType>('monsoon')
  const [userRole, setUserRole] = useState<'planner' | 'viewer'>('planner')

  const seasonInfo = SEASONS_DATA[activeSeason].info
  const restockRows = SEASONS_DATA[activeSeason].rows

  return {
    activeSeason,
    setActiveSeason,
    userRole,
    setUserRole,
    seasonInfo,
    restockRows,
  }
}
