import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  isLoading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyle =
    'px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-200 flex items-center justify-center gap-2 border-0 select-none'
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98]',
    secondary: 'bg-transparent border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-800 active:scale-[0.98]',
  }

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${
        disabled || isLoading ? 'opacity-50 pointer-events-none' : ''
      } ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin h-3 w-3 text-current"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2v4" />
        </svg>
      )}
      {children}
    </button>
  )
}
