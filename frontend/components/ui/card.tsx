import { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-5 shadow-sm transition-all duration-200 hover:-translate-y-[1px] hover:border-slate-300 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
