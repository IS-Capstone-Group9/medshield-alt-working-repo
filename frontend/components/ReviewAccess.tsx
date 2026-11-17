'use client'

import Link from 'next/link'
import type {ReactNode} from 'react'
import {AuthProvider,useAuth} from '@/lib/AuthContext'
import Login from '@/components/Login'
import PasswordResetRequired from '@/components/PasswordResetRequired'

function Content({children}:{children:ReactNode}) {
  const {isAuthenticated,isAuthLoading,user}=useAuth()
  if(isAuthLoading) return <main style={{padding:32}} role="status">Checking your session…</main>
  if(!isAuthenticated) return <Login onLoginSuccess={()=>undefined}/>
  if(user?.mustResetPassword) return <PasswordResetRequired/>
  if(!['admin','analyst'].includes(user?.role.toLowerCase()??'')) return <main style={{padding:32}}>
    <h1>Preview access restricted</h1><p>This release preview is available to administrators and analysts.</p><Link href="/">Return to dashboard</Link>
  </main>
  return children
}
export default function ReviewAccess({children}:{children:ReactNode}) {
  return <AuthProvider><Content>{children}</Content></AuthProvider>
}
