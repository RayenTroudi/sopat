'use client'
import { useEffect, useRef } from 'react'

export function useScrollReveal() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const targets = el.querySelectorAll<HTMLElement>('.reveal')
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    )
    targets.forEach((t) => observer.observe(t))
    return () => observer.disconnect()
  }, [])
  return ref
}
