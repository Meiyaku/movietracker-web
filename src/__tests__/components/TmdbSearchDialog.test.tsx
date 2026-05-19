import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TmdbSearchDialog } from '../../components/TmdbSearchDialog'

const mockSearchMovies = vi.fn()
const mockGetTrailerUrl = vi.fn()
const mockGetThumbnailUrl = vi.fn((p: string) => `thumb${p}`)
const mockGetPosterUrl = vi.fn((p: string) => `poster${p}`)

vi.mock('../../services/tmdbService', () => ({
  searchMovies: (...args: unknown[]) => mockSearchMovies(...args),
  getTrailerUrl: (...args: unknown[]) => mockGetTrailerUrl(...args),
  getThumbnailUrl: (p: string) => mockGetThumbnailUrl(p),
  getPosterUrl: (p: string) => mockGetPosterUrl(p),
}))

const sampleResults = [
  {
    id: 1,
    mediaType: 'movie' as const,
    title: 'Inception',
    name: null,
    releaseDate: '2010-07-16',
    firstAirDate: null,
    overview: 'A dream thief',
    posterPath: '/inception.jpg',
    voteAverage: 8.4,
    genre: 'Science Fiction / Action',
  },
  {
    id: 2,
    mediaType: 'movie' as const,
    title: 'The Matrix',
    name: null,
    releaseDate: '1999-03-31',
    firstAirDate: null,
    overview: null,
    posterPath: null,
    voteAverage: null,
    genre: null,
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TmdbSearchDialog', () => {
  it('renders the search input and Search button', () => {
    render(<TmdbSearchDialog onSelect={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByPlaceholderText('Search for a movie...')).toBeInTheDocument()
    expect(screen.getByText('Search')).toBeInTheDocument()
  })

  it('renders Search TMDB title', () => {
    render(<TmdbSearchDialog onSelect={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Search TMDB')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<TmdbSearchDialog onSelect={vi.fn()} onClose={onClose} />)
    await user.click(screen.getByLabelText('Close'))
    expect(onClose).toHaveBeenCalled()
  })

  it('Search button is disabled when input is empty', () => {
    render(<TmdbSearchDialog onSelect={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Search')).toBeDisabled()
  })

  it('Search button is enabled when input has text', async () => {
    const user = userEvent.setup()
    render(<TmdbSearchDialog onSelect={vi.fn()} onClose={vi.fn()} />)
    await user.type(screen.getByPlaceholderText('Search for a movie...'), 'Inception')
    expect(screen.getByText('Search')).not.toBeDisabled()
  })

  it('shows search results after successful search', async () => {
    mockSearchMovies.mockResolvedValue(sampleResults)
    const user = userEvent.setup()
    render(<TmdbSearchDialog onSelect={vi.fn()} onClose={vi.fn()} />)
    await user.type(screen.getByPlaceholderText('Search for a movie...'), 'Inception')
    await user.click(screen.getByText('Search'))
    await waitFor(() => {
      expect(screen.getByText('Inception')).toBeInTheDocument()
      expect(screen.getByText('The Matrix')).toBeInTheDocument()
    })
  })

  it('shows release year from releaseDate', async () => {
    mockSearchMovies.mockResolvedValue(sampleResults)
    const user = userEvent.setup()
    render(<TmdbSearchDialog onSelect={vi.fn()} onClose={vi.fn()} />)
    await user.type(screen.getByPlaceholderText('Search for a movie...'), 'test')
    await user.click(screen.getByText('Search'))
    await waitFor(() => {
      expect(screen.getByText(/2010/)).toBeInTheDocument()
    })
  })

  it('shows movie overview when available', async () => {
    mockSearchMovies.mockResolvedValue(sampleResults)
    const user = userEvent.setup()
    render(<TmdbSearchDialog onSelect={vi.fn()} onClose={vi.fn()} />)
    await user.type(screen.getByPlaceholderText('Search for a movie...'), 'test')
    await user.click(screen.getByText('Search'))
    await waitFor(() => {
      expect(screen.getByText('A dream thief')).toBeInTheDocument()
    })
  })

  it('shows "No results found." when search returns empty', async () => {
    mockSearchMovies.mockResolvedValue([])
    const user = userEvent.setup()
    render(<TmdbSearchDialog onSelect={vi.fn()} onClose={vi.fn()} />)
    await user.type(screen.getByPlaceholderText('Search for a movie...'), 'xyz')
    await user.click(screen.getByText('Search'))
    await waitFor(() => {
      expect(screen.getByText('No results found.')).toBeInTheDocument()
    })
  })

  it('shows network error message when search fails', async () => {
    mockSearchMovies.mockRejectedValue(new Error('Network error'))
    const user = userEvent.setup()
    render(<TmdbSearchDialog onSelect={vi.fn()} onClose={vi.fn()} />)
    await user.type(screen.getByPlaceholderText('Search for a movie...'), 'test')
    await user.click(screen.getByText('Search'))
    await waitFor(() => {
      expect(screen.getByText('Search failed. Check your network connection.')).toBeInTheDocument()
    })
  })

  it('triggers search on Enter key', async () => {
    mockSearchMovies.mockResolvedValue(sampleResults)
    const user = userEvent.setup()
    render(<TmdbSearchDialog onSelect={vi.fn()} onClose={vi.fn()} />)
    await user.type(screen.getByPlaceholderText('Search for a movie...'), 'Inception{Enter}')
    await waitFor(() => {
      expect(mockSearchMovies).toHaveBeenCalledWith('Inception')
    })
  })

  it('calls onSelect with correct data when a movie is selected', async () => {
    mockSearchMovies.mockResolvedValue(sampleResults)
    mockGetTrailerUrl.mockResolvedValue('https://www.youtube.com/watch?v=trailer')
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<TmdbSearchDialog onSelect={onSelect} onClose={vi.fn()} />)
    await user.type(screen.getByPlaceholderText('Search for a movie...'), 'test')
    await user.click(screen.getByText('Search'))
    await waitFor(() => screen.getByText('Inception'))
    await user.click(screen.getByText('Inception'))
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith({
        title: 'Inception',
        year: '2010',
        posterUrl: 'poster/inception.jpg',
        trailerUrl: 'https://www.youtube.com/watch?v=trailer',
        description: 'A dream thief',
        genre: 'Science Fiction / Action',
      })
    })
  })

  it('calls onSelect with empty trailerUrl when trailer fetch fails', async () => {
    mockSearchMovies.mockResolvedValue([sampleResults[0]])
    mockGetTrailerUrl.mockRejectedValue(new Error('fetch failed'))
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<TmdbSearchDialog onSelect={onSelect} onClose={vi.fn()} />)
    await user.type(screen.getByPlaceholderText('Search for a movie...'), 'test')
    await user.click(screen.getByText('Search'))
    await waitFor(() => screen.getByText('Inception'))
    await user.click(screen.getByText('Inception'))
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ trailerUrl: '' }))
    })
  })

  it('does not search when input is empty (whitespace only)', async () => {
    const user = userEvent.setup()
    render(<TmdbSearchDialog onSelect={vi.fn()} onClose={vi.fn()} />)
    await user.type(screen.getByPlaceholderText('Search for a movie...'), '   {Enter}')
    expect(mockSearchMovies).not.toHaveBeenCalled()
  })

  it('pre-fills the search input when initialQuery is provided', () => {
    render(<TmdbSearchDialog onSelect={vi.fn()} onClose={vi.fn()} initialQuery="Avengers" />)
    expect(screen.getByPlaceholderText('Search for a movie...')).toHaveValue('Avengers')
  })

  it('automatically triggers search when initialQuery is provided', async () => {
    mockSearchMovies.mockResolvedValue(sampleResults)
    render(<TmdbSearchDialog onSelect={vi.fn()} onClose={vi.fn()} initialQuery="Avengers" />)
    await waitFor(() => {
      expect(mockSearchMovies).toHaveBeenCalledWith('Avengers')
    })
  })

  it('does not auto-search when initialQuery is empty', () => {
    render(<TmdbSearchDialog onSelect={vi.fn()} onClose={vi.fn()} initialQuery="" />)
    expect(mockSearchMovies).not.toHaveBeenCalled()
  })
})
