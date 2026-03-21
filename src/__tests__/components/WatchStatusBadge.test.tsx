import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WatchStatusBadge } from '../../components/WatchStatusBadge'
import { WatchStatus } from '../../types'

describe('WatchStatusBadge', () => {
  it('displays "Watched" for WATCHED status', () => {
    render(<WatchStatusBadge status={WatchStatus.WATCHED} />)
    expect(screen.getByText('Watched')).toBeInTheDocument()
  })

  it('displays "Want to Watch" for WANT_TO_WATCH status', () => {
    render(<WatchStatusBadge status={WatchStatus.WANT_TO_WATCH} />)
    expect(screen.getByText('Want to Watch')).toBeInTheDocument()
  })

  it('applies green styling for WATCHED', () => {
    render(<WatchStatusBadge status={WatchStatus.WATCHED} />)
    const badge = screen.getByText('Watched')
    expect(badge.className).toContain('bg-watched-fill')
    expect(badge.className).toContain('text-green-900')
  })

  it('applies red styling for WANT_TO_WATCH', () => {
    render(<WatchStatusBadge status={WatchStatus.WANT_TO_WATCH} />)
    const badge = screen.getByText('Want to Watch')
    expect(badge.className).toContain('bg-want-fill')
    expect(badge.className).toContain('text-white')
  })
})
