import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { StarRating } from '../../components/StarRating'

function filledStars(container: HTMLElement) {
  return container.querySelectorAll('[data-testid="star-full"]')
}

function halfStars(container: HTMLElement) {
  return container.querySelectorAll('[data-testid="star-half"]')
}

function emptyStars(container: HTMLElement) {
  return container.querySelectorAll('[data-testid="star-empty"]')
}

describe('StarRating', () => {
  it('returns null when rating is null', () => {
    const { container } = render(<StarRating rating={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders 5 stars by default', () => {
    const { container } = render(<StarRating rating={3} />)
    expect(container.querySelectorAll('[data-testid^="star-"]')).toHaveLength(5)
  })

  it('renders custom max stars', () => {
    const { container } = render(<StarRating rating={2} max={3} />)
    expect(container.querySelectorAll('[data-testid^="star-"]')).toHaveLength(3)
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

  it('renders half star for 0.5 increment', () => {
    const { container } = render(<StarRating rating={2.5} />)
    expect(filledStars(container)).toHaveLength(2)
    expect(halfStars(container)).toHaveLength(1)
    expect(emptyStars(container)).toHaveLength(2)
  })
})
