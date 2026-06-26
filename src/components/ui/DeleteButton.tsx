'use client'

import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'icon' | 'text' | 'outline'

type Props = {
  onClick:   () => void
  disabled?: boolean
  variant?:  Variant
  label?:    string
  className?: string
}

export function DeleteButton({ onClick, disabled, variant = 'icon', label = 'Supprimer', className }: Props) {
  if (variant === 'icon') {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        title={label}
        aria-label={label}
        className={cn(
          'inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 disabled:opacity-40',
          'hover:bg-[var(--admin-red-dim)] active:scale-95',
          className
        )}
        style={{ color: 'var(--admin-red)' }}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    )
  }

  if (variant === 'outline') {
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150 disabled:opacity-40',
          'border hover:bg-[var(--admin-red-dim)] active:scale-95',
          className
        )}
        style={{ borderColor: 'rgba(28,61,46,0.25)', color: 'var(--admin-red)' }}
      >
        <Trash2 className="w-3 h-3" />
        {label}
      </button>
    )
  }

  // text variant
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'text-[12px] underline underline-offset-2 transition-opacity hover:opacity-70 disabled:opacity-40',
        className
      )}
      style={{ color: 'var(--admin-red)' }}
    >
      {label}
    </button>
  )
}
