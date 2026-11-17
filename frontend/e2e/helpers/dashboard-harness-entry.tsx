import { createRoot } from 'react-dom/client'
import { useDashboardRuntime } from '@/hooks/use-dashboard-runtime'

/** Mounts the real dashboard runtime for fixture tests. Authentication is outside this harness. */
function Harness() {
  const { rootRef } = useDashboardRuntime(async () => undefined, {
    accountId: 1, username: 'fixture', email: 'fixture@example.test', role: 'admin', mustResetPassword: false,
  })
  return <div ref={rootRef} className="medshield-root" />
}

createRoot(document.getElementById('harness')!).render(<Harness />)
