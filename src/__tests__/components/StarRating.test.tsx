import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { StarRating } from '../../components/StarRating'

function filledStars(container: HTMLElement) {
  return Array.from(container.querySelectorAll('svg')).filter((s) =>
    s.getAttribute('class')?.includes('text-star'),
  )
}

function emptyStars(container: HTMLElement) {
  return Array.from(container.querySelectorAll('svg')).filter((s) =>
    s.getAttribute('class')?.includes('text-gray-300'),
  )
}

describe('StarRating', () => {
  it('returns null when rating is null', () => {
    const { container } = render(<StarRating rating={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders 5 stars by default', () => {
    const { container } = render(<StarRating rating={3} />)
    expect(container.querySelectorAll('svg')).toHaveLength(5)
  })

  it('renders custom max stars', () => {
    const { container } = render(<StarRating rating={2} max={3} />)
    expect(container.querySelectorAll('svg')).toHaveLength(3)
  })

  it('fills stars up to the rating value', () => {
    const { container } = render(<StarRating rating={3} />)
    expect(filledStars(container)).toHaveLength(3)
    expect(emptyStars(container)).toHaveLength(2)
  })

  it('fills all stars for max rating', () => {
    const { container } = render(<StarRating rating={5} />)
    expect(filledStars(container)).toHaveLength(5)
    expect(emptyStars(container)).toHaveLength(0)
  })

  it('fills no stars for rating of 0', () => {
    const { container } = render(<StarRating rating={0} />)
    expect(filledStars(container)).toHaveLength(0)
    expect(emptyStars(container)).toHaveLength(5)
  })
})
