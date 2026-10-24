import { useEffect, useState } from 'react'
import { getJson } from '@/services/api/api-client'

/** A changed filter immediately hides old results; late responses cannot replace the current scope. */
export function useResource<T>(path: string | null, revision = 0) {
  const key = `${path}:${revision}`
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key: '' })
  useEffect(() => {
    if (!path) return
    let active = true
    getJson<T>(path).then(data => { if (active) setState({ key, data }) }).catch(error => { if (active) setState({ key, error: error instanceof Error ? error.message : 'Source unavailable' }) })
    return () => { active = false }
  }, [key, path])
  return { data: state.key === key ? state.data : undefined, error: state.key === key ? state.error : undefined, loading: Boolean(path && state.key !== key) }
}
