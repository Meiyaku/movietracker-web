import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StarRatingPicker } from '../../components/StarRatingPicker'

function filledStars(container: HTMLElement) {
  return Array.from(container.querySelectorAll('svg')).filter((s) =>
    s.getAttribute('class')?.includes('text-star'),
  )
}

describe('StarRatingPicker', () => {
  it('renders 5 star buttons by default', () => {
    render(<StarRatingPicker value={null} onChange={vi.fn()} />)
    expect(screen.getAllByRole('button')).toHaveLength(5)
  })

  it('renders custom max stars', () => {
    render(<StarRatingPicker value={null} onChange={vi.fn()} max={3} />)
    expect(screen.getAllByRole('button')).toHaveLength(3)
  })

  it('each button has accessible aria-label', () => {
    render(<StarRatingPicker value={null} onChange={vi.fn()} />)
    expect(screen.getByLabelText('Rate 1 star')).toBeInTheDocument()
    expect(screen.getByLabelText('Rate 2 stars')).toBeInTheDocument()
    expect(screen.getByLabelText('Rate 5 stars')).toBeInTheDocument()
  })

  it('calls onChange with clicked star value', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<StarRatingPicker value={null} onChange={onChange} />)
    await user.click(screen.getByLabelText('Rate 3 stars'))
    expect(onChange).toHaveBeenCalledWith(3)
  })

  it('calls onChange with correct value for each star', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<StarRatingPicker value={null} onChange={onChange} />)
    for (let i = 1; i <= 5; i++) {
      await user.click(screen.getByLabelText(`Rate ${i} star${i > 1 ? 's' : ''}`))
      expect(onChange).toHaveBeenLastCalledWith(i)
    }
  })

  it('highlights stars up to current value', () => {
    const { container } = render(<StarRatingPicker value={3} onChange={vi.fn()} />)
    expect(filledStars(container)).toHaveLength(3)
  })

  it('shows hover preview on mouse enter', () => {
    const { container } = render(<StarRatingPicker value={1} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.mouseEnter(buttons[4]) // hover 5th star
    expect(filledStars(container)).toHaveLength(5)
  })

  it('reverts to value after mouse leave', () => {
    const { container } = render(<StarRatingPicker value={2} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button')
    fireEvent.mouseEnter(buttons[4])
    fireEvent.mouseLeave(buttons[4])
    expect(filledStars(container)).toHaveLength(2)
  })
})
