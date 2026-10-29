/**
 * Minimal monochrome icon set (stroke/fill = currentColor) so the app can be
 * strictly black and white without colorful emoji glyphs.
 */

export function GoogleIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.1 3.58-5.18 3.58-8.82z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.28v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.28a12 12 0 0 0 0 10.76l3.99-3.1z" />
      <path fill="#EA4335" d="M12 4.76c1.77 0 3.35.61 4.6 1.8l3.44-3.44A12 12 0 0 0 1.28 6.62l3.99 3.1C6.22 6.87 8.87 4.76 12 4.76z" />
    </svg>
  )
}

export function Mic({ size = 15, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  )
}

export function Bolt({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M13 2 3 14h7l-1 8 10-12h-7z" />
    </svg>
  )
}

export function Play({ size = 13, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6 4l14 8-14 8z" />
    </svg>
  )
}

export function TelegramIcon({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M21.94 4.07c.19-.88-.64-1.6-1.47-1.29L2.7 9.24c-1.15.43-1.04 2.11.15 2.39l4.52 1.06 1.66 5.25c.32 1.01 1.63 1.18 2.2.28l2.06-3.25 4.24 3.12c.82.6 1.99.14 2.2-.87l2.2-13.15zm-13.2 7.74 8.8-5.49c.3-.18.61.2.34.43l-6.8 6.02c-.31.27-.52.64-.6 1.04l-.29 1.84c-.05.33-.51.36-.6.04l-.9-3.2a.85.85 0 0 1 .05-.68z" />
    </svg>
  )
}