import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Timestamp } from 'firebase/firestore'
import { MovieDetailView } from '../../components/MovieDetailView'
import { Movie, WatchStatus } from '../../types'

vi.mock('firebase/firestore', () => ({
  Timestamp: { now: vi.fn(() => ({ seconds: 0, nanoseconds: 0 })) },
  getFirestore: vi.fn(() => ({})),
}))

vi.mock('../../firebase', () => ({ db: {}, auth: {} }))
vi.mock('../../services/tmdbService', () => ({
  getWatchProviders: vi.fn(),
}))

const ts = { seconds: 0, nanoseconds: 0 } as unknown as Timestamp

const baseMovie: Movie = {
  id: 'm1',
  title: 'Inception',
  year: '2010',
  genre: 'Sci-Fi',
  status: WatchStatus.WATCHED,
  rating: 4,
  description: 'A thief who steals corporate secrets.',
  notes: 'Mind-bending.',
  trailerUrl: 'https://youtube.com/watch?v=abc',
  posterUrl: 'https://img.com/poster.jpg',
  listIds: ['list0', 'list1'],
  createdAt: ts,
  tmdbId: null,
  tmdbMediaType: null,
  tmdbLookupAttempted: false,
}

describe('MovieDetailView', () => {
  it('renders the movie title', () => {
    render(<MovieDetailView movie={baseMovie} />)
    expect(screen.getByText('Inception')).toBeInTheDocument()
  })

  it('renders year and genre', () => {
    render(<MovieDetailView movie={baseMovie} />)
    expect(screen.getByText('2010')).toBeInTheDocument()
    expect(screen.getByText('Sci-Fi')).toBeInTheDocument()
  })

  it('renders description', () => {
    render(<MovieDetailView movie={baseMovie} />)
    expect(screen.getByText('A thief who steals corporate secrets.')).toBeInTheDocument()
  })

  it('renders notes', () => {
    render(<MovieDetailView movie={baseMovie} />)
    expect(screen.getByText('Mind-bending.')).toBeInTheDocument()
  })

  it('renders a trailer link', () => {
    render(<MovieDetailView movie={baseMovie} />)
    const link = screen.getByRole('link', { name: /Watch Trailer/i })
    expect(link).toHaveAttribute('href', 'https://youtube.com/watch?v=abc')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('does not render a trailer link when trailerUrl is empty', () => {
    render(<MovieDetailView movie={{ ...baseMovie, trailerUrl: '' }} />)
    expect(screen.queryByRole('link', { name: /Watch Trailer/i })).not.toBeInTheDocument()
  })

  it('renders poster image when posterUrl is set', () => {
    render(<MovieDetailView movie={baseMovie} />)
    const img = screen.getByRole('img', { name: 'Inception' })
    expect(img).toHaveAttribute('src', 'https://img.com/poster.jpg')
  })

  it('does not render year/genre section when both are empty', () => {
    render(<MovieDetailView movie={{ ...baseMovie, year: '', genre: '' }} />)
    expect(screen.queryByText('Year:')).not.toBeInTheDocument()
    expect(screen.queryByText('Genre:')).not.toBeInTheDocument()
  })
})
