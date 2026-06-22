import * as React from 'react'
import { cn } from '@/lib/utils'

export type StatusTone =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'accent'
  | 'purple'
  | 'teal'

const TONE_CLASS: Record<StatusTone, string> = {
  success: 'status-pill status-pill-success',
  warning: 'status-pill status-pill-warning',
  error:   'status-pill status-pill-error',
  info:    'status-pill status-pill-info',
  neutral: 'status-pill status-pill-neutral',
  accent:  'status-pill status-pill-accent',
  purple:  'status-pill status-pill-purple',
  teal:    'status-pill status-pill-teal',
}

type Props = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: StatusTone
  dot?: boolean
}

export function StatusBadge({ tone = 'neutral', dot = false, className, children, ...rest }: Props) {
  return (
    <span className={cn(TONE_CLASS[tone], className)} {...rest}>
      {dot && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: 'currentColor' }}
          aria-hidden
        />
      )}
      {children}
    </span>
  )
}
