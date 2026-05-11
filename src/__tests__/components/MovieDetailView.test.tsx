import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Timestamp } from 'firebase/firestore'
import { MovieDetailView } from '../../components/MovieDetailView'
import { Movie, MovieList, WatchStatus, MY_MOVIES_LIST_NAME } from '../../types'

vi.mock('firebase/firestore', () => ({
  Timestamp: { now: vi.fn(() => ({ seconds: 0, nanoseconds: 0 })) },
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
}

const lists: MovieList[] = [
  { id: 'list0', name: MY_MOVIES_LIST_NAME, createdAt: ts },
  { id: 'list1', name: 'Watchlist', createdAt: ts },
]

describe('MovieDetailView', () => {
  it('renders the movie title', () => {
    render(<MovieDetailView movie={baseMovie} lists={lists} />)
    expect(screen.getByText('Inception')).toBeInTheDocument()
  })

  it('renders year and genre', () => {
    render(<MovieDetailView movie={baseMovie} lists={lists} />)
    expect(screen.getByText('2010')).toBeInTheDocument()
    expect(screen.getByText('Sci-Fi')).toBeInTheDocument()
  })

  it('renders description', () => {
    render(<MovieDetailView movie={baseMovie} lists={lists} />)
    expect(screen.getByText('A thief who steals corporate secrets.')).toBeInTheDocument()
  })

  it('renders notes', () => {
    render(<MovieDetailView movie={baseMovie} lists={lists} />)
    expect(screen.getByText('Mind-bending.')).toBeInTheDocument()
  })

  it('renders a trailer link', () => {
    render(<MovieDetailView movie={baseMovie} lists={lists} />)
    const link = screen.getByRole('link', { name: /Watch Trailer/i })
    expect(link).toHaveAttribute('href', 'https://youtube.com/watch?v=abc')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('does not render a trailer link when trailerUrl is empty', () => {
    render(<MovieDetailView movie={{ ...baseMovie, trailerUrl: '' }} lists={lists} />)
    expect(screen.queryByRole('link', { name: /Watch Trailer/i })).not.toBeInTheDocument()
  })

  it('renders poster image when posterUrl is set', () => {
    render(<MovieDetailView movie={baseMovie} lists={lists} />)
    const img = screen.getByRole('img', { name: 'Inception' })
    expect(img).toHaveAttribute('src', 'https://img.com/poster.jpg')
  })

  it('renders list badges for each list the movie belongs to', () => {
    render(<MovieDetailView movie={baseMovie} lists={lists} />)
    expect(screen.getByText(MY_MOVIES_LIST_NAME)).toBeInTheDocument()
    expect(screen.getByText('Watchlist')).toBeInTheDocument()
  })

  it('does not render list badges for lists the movie is not in', () => {
    const otherList: MovieList = { id: 'list2', name: 'Favorites', createdAt: ts }
    render(<MovieDetailView movie={baseMovie} lists={[...lists, otherList]} />)
    expect(screen.queryByText('Favorites')).not.toBeInTheDocument()
  })

  it('does not render year/genre section when both are empty', () => {
    render(<MovieDetailView movie={{ ...baseMovie, year: '', genre: '' }} lists={lists} />)
    expect(screen.queryByText('Year:')).not.toBeInTheDocument()
    expect(screen.queryByText('Genre:')).not.toBeInTheDocument()
  })
})
