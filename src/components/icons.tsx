import type { ReactNode } from 'react'

interface IconProps {
  className?: string
  strokeWidth?: number
}

function Icon({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {children}
    </svg>
  )
}

export function MenuIcon({ className, strokeWidth = 2 }: IconProps) {
  return (
    <Icon className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M4 6h16M4 12h16M4 18h16" />
    </Icon>
  )
}

export function CloseIcon({ className, strokeWidth = 2 }: IconProps) {
  return (
    <Icon className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M6 18L18 6M6 6l12 12" />
    </Icon>
  )
}

export function SearchIcon({ className, strokeWidth = 2 }: IconProps) {
  return (
    <Icon className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </Icon>
  )
}

export function SortIcon({ className, strokeWidth = 2 }: IconProps) {
  return (
    <Icon className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M3 4h13M3 8h9M3 12h5m9-4v12m0 0l-3-3m3 3l3-3" />
    </Icon>
  )
}

export function PlusIcon({ className, strokeWidth = 2.5 }: IconProps) {
  return (
    <Icon className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M12 4v16m8-8H4" />
    </Icon>
  )
}

export function SettingsIcon({ className, strokeWidth = 2 }: IconProps) {
  return (
    <Icon className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </Icon>
  )
}

export function EyeIcon({ className, strokeWidth = 2 }: IconProps) {
  return (
    <Icon className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </Icon>
  )
}

export function EyeOffIcon({ className, strokeWidth = 2 }: IconProps) {
  return (
    <Icon className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M13.875 18.825A10.05 10.05 0 0112 19c-5 0-9-4-9-7s4-7 9-7a9.97 9.97 0 016.375 2.325M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} d="M3 3l18 18" />
    </Icon>
  )
}
