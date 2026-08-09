import { useState, FormEvent } from 'react'
import { useAuth } from '@/lib/AuthContext'
import { isSupabaseBrowserConfigured } from '@/lib/supabase/client'

interface UseLoginFormProps {
  onLoginSuccess: () => void
}

export function useLoginForm({ onLoginSuccess }: UseLoginFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  
  const { login } = useAuth()
  const useSupabaseAuth = isSupabaseBrowserConfigured()

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    setLoginError('')

    if (!username || !password) {
      setLoginError(
        useSupabaseAuth
          ? 'Please enter both email and password.'
          : 'Please enter both username and password.'
      )
      return
    }

    if (useSupabaseAuth && !username.includes('@')) {
      setLoginError('Supabase Auth sign-in requires an email address.')
      return
    }

    setLoginLoading(true)
    const result = await login(username, password, rememberMe)
    setLoginLoading(false)

    if (result.ok) {
      onLoginSuccess()
      return
    }

    setLoginError(result.error || 'Invalid username or password.')
  }

  return {
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    rememberMe,
    setRememberMe,
    loginError,
    setLoginError,
    loginLoading,
    useSupabaseAuth,
    handleLogin,
  }
}
