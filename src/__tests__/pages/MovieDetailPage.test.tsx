import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { WatchStatus } from '../../types'

const mockNavigate = vi.fn()
let mockId = 'movie-1'
let mockLocationState: Record<string, unknown> | null = null

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: mockId }),
  useLocation: () => ({ state: mockLocationState, pathname: `/movies/${mockId}` }),
}))

vi.mock('../../context/AuthContext', () => {
  const user = { uid: 'test-uid', email: 'test@example.com' }
  return { useAuth: () => ({ user, loading: false }) }
})

vi.mock('../../components/TmdbSearchDialog', () => ({
  TmdbSearchDialog: () => <div data-testid="tmdb-dialog" />,
}))

const mockGetMovie = vi.fn()
const mockAddMovie = vi.fn()
const mockUpdateMovie = vi.fn()
const mockDeleteMovie = vi.fn()
const mockCheckDuplicate = vi.fn()
vi.mock('../../services/movieService', () => ({
  getMovie: (...args: unknown[]) => mockGetMovie(...args),
  addMovie: (...args: unknown[]) => mockAddMovie(...args),
  updateMovie: (...args: unknown[]) => mockUpdateMovie(...args),
  deleteMovie: (...args: unknown[]) => mockDeleteMovie(...args),
  checkDuplicate: (...args: unknown[]) => mockCheckDuplicate(...args),
}))

const mockSubscribeToLists = vi.fn()
vi.mock('../../services/movieListService', () => ({
  subscribeToLists: (...args: unknown[]) => mockSubscribeToLists(...args),
}))

vi.mock('../../services/remoteConfigService', () => ({
  fetchRemoteConfig: () => Promise.resolve(),
  isTmdbSearchEnabled: () => true,
}))

vi.mock('firebase/firestore', () => ({
  Timestamp: { now: () => ({ seconds: 0, nanoseconds: 0 }) },
}))

import { MovieDetailPage } from '../../pages/MovieDetailPage'

const fakeTs = { seconds: 0, nanoseconds: 0 }
const fakeMovie = {
  id: 'movie-1',
  title: 'Inception',
  year: '2010',
  genre: 'Sci-Fi',
  status: WatchStatus.WATCHED,
  rating: 5,
  description: 'A mind-bending thriller.',
  notes: 'Great film',
  trailerUrl: 'https://youtube.com/watch?v=abc',
  posterUrl: '',
  listIds: ['list1'],
  createdAt: fakeTs,
}

const fakeList = { id: 'list1', name: 'All Movies', createdAt: fakeTs }

function renderPage() {
  return render(
    <MemoryRouter>
      <MovieDetailPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockId = 'movie-1'
  mockLocationState = null
  mockGetMovie.mockResolvedValue(fakeMovie)
  mockCheckDuplicate.mockResolvedValue(false)
  mockSubscribeToLists.mockImplementation((_uid: string, onData: (l: unknown[]) => void) => {
    onData([fakeList])
    return vi.fn()
  })
})

describe('MovieDetailPage — view mode', () => {
  it('shows loading spinner initially', () => {
    mockGetMovie.mockReturnValue(new Promise(() => {}))
    renderPage()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders movie details after loading', async () => {
    renderPage()
    await waitFor(() => expect(screen.getAllByText('Inception').length).toBeGreaterThan(0))
    expect(screen.getByText('A mind-bending thriller.')).toBeInTheDocument()
    expect(screen.getByText('Watch Trailer')).toBeInTheDocument()
  })

  it('shows not found state when movie is missing', async () => {
    mockGetMovie.mockResolvedValue(null)
    renderPage()
    await waitFor(() => expect(screen.getByText('Movie not found.')).toBeInTheDocument())
  })

  it('enters edit mode on Edit button click', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => screen.getByText('Edit'))
    await user.click(screen.getByText('Edit'))
    expect(screen.getByPlaceholderText('Movie title')).toBeInTheDocument()
  })
})

describe('MovieDetailPage — new movie', () => {
  beforeEach(() => { mockId = 'new' })

  it('renders the add form immediately', async () => {
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Search TMDB to auto-fill details')).toBeInTheDocument(),
    )
    expect(screen.getByPlaceholderText('Movie title')).toBeInTheDocument()
  })

  it('Save button is disabled when title is empty', async () => {
    renderPage()
    await waitFor(() => screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(mockAddMovie).not.toHaveBeenCalled()
  })

  it('saves new movie and navigates on success', async () => {
    const user = userEvent.setup()
    mockAddMovie.mockResolvedValue('new-movie-id')
    renderPage()
    await waitFor(() => screen.getByPlaceholderText('Movie title'))
    await user.type(screen.getByPlaceholderText('Movie title'), 'Dune')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(mockAddMovie).toHaveBeenCalled())
    expect(mockNavigate).toHaveBeenCalledWith('/movies/new-movie-id', { replace: true })
  })

  it('opens TMDB dialog immediately when initialTmdbQuery is in location state', async () => {
    mockLocationState = { initialTmdbQuery: 'Avengers' }
    renderPage()
    await waitFor(() => expect(screen.getByTestId('tmdb-dialog')).toBeInTheDocument())
  })

  it('does not open TMDB dialog when no initialTmdbQuery in location state', async () => {
    renderPage()
    await waitFor(() => screen.getByText('Search TMDB to auto-fill details'))
    expect(screen.queryByTestId('tmdb-dialog')).not.toBeInTheDocument()
  })
})

describe('MovieDetailPage — delete', () => {
  it('shows delete confirmation dialog', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => screen.getByText('Edit'))
    await user.click(screen.getByText('Edit'))
    await user.click(screen.getByRole('button', { name: 'Delete Movie' }))
    expect(screen.getByRole('heading', { name: 'Delete Movie' })).toBeInTheDocument()
    expect(screen.getByText(/cannot be undone/)).toBeInTheDocument()
  })

  it('deletes movie and navigates home on confirm', async () => {
    const user = userEvent.setup()
    mockDeleteMovie.mockResolvedValue(undefined)
    renderPage()
    await waitFor(() => screen.getByText('Edit'))
    await user.click(screen.getByText('Edit'))
    await user.click(screen.getByRole('button', { name: 'Delete Movie' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(mockDeleteMovie).toHaveBeenCalledWith('test-uid', 'movie-1'))
    expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true, state: { movieDeleted: 'Inception' } })
  })
})
