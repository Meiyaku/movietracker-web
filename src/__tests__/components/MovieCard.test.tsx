import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MovieCard } from '../../components/MovieCard'
import { WatchStatus } from '../../types'
import { Timestamp } from 'firebase/firestore'

vi.mock('firebase/firestore', () => ({
  Timestamp: { now: vi.fn(() => ({ seconds: 1000, nanoseconds: 0 })) },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const baseMovie = {
  id: 'movie1',
  title: 'Inception',
  year: '2010',
  genre: 'Sci-Fi',
  status: WatchStatus.WATCHED,
  rating: 4,
  description: 'Dreams',
  notes: '',
  trailerUrl: '',
  posterUrl: 'https://img.com/poster.jpg',
  listIds: ['list1'],
  createdAt: { seconds: 1000, nanoseconds: 0 } as unknown as Timestamp,
}

function renderCard(movie = baseMovie) {
  return render(
    <MemoryRouter>
      <MovieCard movie={movie} />
    </MemoryRouter>,
  )
}

describe('MovieCard', () => {
  it('renders movie title', () => {
    renderCard()
    expect(screen.getByText('Inception')).toBeInTheDocument()
  })

  it('renders movie year', () => {
    renderCard()
    expect(screen.getByText('2010')).toBeInTheDocument()
  })

  it('does not render year paragraph when year is empty', () => {
    const { container } = renderCard({ ...baseMovie, year: '' })
    const yearEl = container.querySelector('p.text-xs')
    expect(yearEl).toBeNull()
  })

  it('renders poster image when posterUrl is set', () => {
    renderCard()
    const img = screen.getByRole('img', { name: 'Inception' })
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://img.com/poster.jpg')
  })

  it('renders fallback icon SVG when posterUrl is empty', () => {
    const { container } = renderCard({ ...baseMovie, posterUrl: '' })
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders "Watched" status badge', () => {
    renderCard()
    expect(screen.getByText('Watched')).toBeInTheDocument()
  })

  it('renders "Want to Watch" status badge', () => {
    renderCard({ ...baseMovie, status: WatchStatus.WANT_TO_WATCH })
    expect(screen.getByText('Want to Watch')).toBeInTheDocument()
  })

  it('renders star rating SVGs when rating is set', () => {
    const { container } = renderCard()
    const filled = Array.from(container.querySelectorAll('svg')).filter((s) =>
      s.getAttribute('class')?.includes('text-star'),
    )
    expect(filled.length).toBeGreaterThan(0)
  })

  it('does not render star SVGs when rating is null', () => {
    const { container } = renderCard({ ...baseMovie, rating: null })
    const filled = Array.from(container.querySelectorAll('svg')).filter((s) =>
      s.getAttribute('class')?.includes('text-star'),
    )
    expect(filled).toHaveLength(0)
  })

  it('navigates to movie detail page on click', async () => {
    const user = userEvent.setup()
    renderCard()
    await user.click(screen.getByText('Inception'))
    expect(mockNavigate).toHaveBeenCalledWith('/movies/movie1')
  })
})
