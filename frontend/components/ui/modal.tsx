import { ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  children: ReactNode
}

export function Modal({ isOpen, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="custom-modal-backdrop fixed inset-0 bg-slate-900/40 z-[1000] flex items-center justify-center animate-fade-in">
      <div className="custom-modal-card bg-white border border-slate-200 rounded-xl p-5 max-w-[440px] w-[90%] shadow-lg animate-scale-in">
        {children}
      </div>
    </div>
  )
}
