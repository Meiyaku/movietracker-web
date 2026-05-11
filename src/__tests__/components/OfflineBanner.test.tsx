import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OfflineBanner } from '../../components/OfflineBanner'

describe('OfflineBanner', () => {
  it('renders the offline message', () => {
    render(<OfflineBanner />)
    expect(screen.getByText(/You're offline/)).toBeInTheDocument()
  })

  it('is fixed to the top of the viewport', () => {
    const { container } = render(<OfflineBanner />)
    const banner = container.firstChild as HTMLElement
    expect(banner.className).toContain('fixed')
    expect(banner.className).toContain('top-0')
  })

  it('has a high z-index to appear above other content', () => {
    const { container } = render(<OfflineBanner />)
    const banner = container.firstChild as HTMLElement
    expect(banner.className).toContain('z-50')
  })
})
