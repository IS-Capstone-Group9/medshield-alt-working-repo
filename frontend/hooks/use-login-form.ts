import { useState, FormEvent } from 'react'
import { useAuth } from '@/lib/AuthContext'

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

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    setLoginError('')

    if (!username || !password) {
      setLoginError('Please enter both username or email and password.')
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
    handleLogin,
  }
}
