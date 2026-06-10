"use client"

import React, { createContext, useContext, useState } from 'react'

type ContextValue = {
  selectedYear: string | null
  setSelectedYear: (year: string | null) => void
}

const DashboardContext = createContext<ContextValue | undefined>(undefined)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [selectedYear, setSelectedYear] = useState<string | null>(null)
  return <DashboardContext.Provider value={{ selectedYear, setSelectedYear }}>{children}</DashboardContext.Provider>
}

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error('useDashboard must be used within DashboardProvider')
  return ctx
}
