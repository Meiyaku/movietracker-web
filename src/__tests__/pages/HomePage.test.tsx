import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { WatchStatus } from '../../types'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => mockNavigate,
}))

// Stable user object — a new object ref per render causes useEffect([user]) to loop infinitely
vi.mock('../../context/AuthContext', () => {
  const user = { uid: 'test-uid', email: 'test@example.com' }
  return { useAuth: () => ({ user, loading: false }) }
})

vi.mock('../../components/AppDrawer', () => ({
  AppDrawer: ({ lists }: { lists: { id: string; name: string }[] }) => (
    <div data-testid="app-drawer">
      {lists.map((l) => <div key={l.id}>{l.name}</div>)}
    </div>
  ),
}))

vi.mock('../../components/MovieCard', () => ({
  MovieCard: ({ movie }: { movie: { title: string } }) => (
    <div data-testid="movie-card">{movie.title}</div>
  ),
}))

const mockSubscribeToLists = vi.fn()
vi.mock('../../services/movieListService', () => ({
  subscribeToLists: (...args: unknown[]) => mockSubscribeToLists(...args),
  sortLists: (l: unknown) => l,
}))

const mockGetMoviesPage = vi.fn()
const mockSubscribeToAllMovies = vi.fn()
vi.mock('../../services/movieService', () => ({
  getMoviesPage: (...args: unknown[]) => mockGetMoviesPage(...args),
  subscribeToAllMovies: (...args: unknown[]) => mockSubscribeToAllMovies(...args),
  StaleCursorError: class StaleCursorError extends Error {},
}))

vi.mock('../../services/remoteConfigService', () => ({
  pageSize: () => 25,
  isTmdbSearchEnabled: () => false,
  tmdbApiKey: () => '',
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  Timestamp: { now: () => ({ seconds: 0, nanoseconds: 0 }) },
}))

import { HomePage } from '../../pages/HomePage'

const fakeTs = { seconds: 0, nanoseconds: 0 }
// Stable list object — same reference avoids spurious re-renders
const fakeList = { id: 'list1', name: 'All Movies', createdAt: fakeTs }

function fakeMovie(id: string, title: string) {
  return {
    id,
    title,
    year: '2020',
    genre: 'Drama',
    status: WatchStatus.WATCHED,
    rating: 4,
    description: '',
    notes: '',
    trailerUrl: '',
    posterUrl: '',
    listIds: ['list1'],
    createdAt: fakeTs,
  }
}

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockSubscribeToLists.mockImplementation(
    (_uid: string, onData: (l: unknown[]) => void) => {
      onData([fakeList])
      return vi.fn()
    },
  )
  mockGetMoviesPage.mockResolvedValue({
    movies: [fakeMovie('m1', 'Inception'), fakeMovie('m2', 'Dune')],
    lastDoc: null,
    hasMore: false,
  })
  mockSubscribeToAllMovies.mockImplementation(
    (_uid: string, onData: (m: unknown[]) => void) => {
      onData([fakeMovie('m1', 'Inception'), fakeMovie('m2', 'Dune')])
      return vi.fn()
    },
  )
})

describe('HomePage', () => {
  it('renders movie cards', async () => {
    renderHomePage()
    await waitFor(() => expect(screen.getAllByTestId('movie-card')).toHaveLength(2))
    expect(screen.getByText('Inception')).toBeInTheDocument()
    expect(screen.getByText('Dune')).toBeInTheDocument()
  })

  it('filters movies by search query', async () => {
    const user = userEvent.setup()
    renderHomePage()
    await waitFor(() => screen.getAllByTestId('movie-card'))
    await user.type(screen.getByPlaceholderText('Search movies…'), 'Inception')
    expect(screen.getByText('Inception')).toBeInTheDocument()
    expect(screen.queryByText('Dune')).not.toBeInTheDocument()
  })

  it('shows empty state when no movies', async () => {
    mockGetMoviesPage.mockResolvedValue({ movies: [], lastDoc: null, hasMore: false })
    renderHomePage()
    await waitFor(() => expect(screen.getByText('No movies yet')).toBeInTheDocument())
  })

  it('shows no results message for unmatched search', async () => {
    const user = userEvent.setup()
    renderHomePage()
    await waitFor(() => screen.getAllByTestId('movie-card'))
    await user.type(screen.getByPlaceholderText('Search movies…'), 'zzznomatch')
    expect(screen.getByText(/No movies match/)).toBeInTheDocument()
  })

  it('shows spelling hint and Add Movie button when search has no results', async () => {
    const user = userEvent.setup()
    renderHomePage()
    await waitFor(() => screen.getAllByTestId('movie-card'))
    await user.type(screen.getByPlaceholderText('Search movies…'), 'zzznomatch')
    expect(screen.getByText('Check the spelling')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add Movie' })).toBeInTheDocument()
  })

  it('navigates with initialTmdbQuery when Add Movie clicked from empty search', async () => {
    const user = userEvent.setup()
    renderHomePage()
    await waitFor(() => screen.getAllByTestId('movie-card'))
    await user.type(screen.getByPlaceholderText('Search movies…'), 'zzznomatch')
    await user.click(screen.getByRole('button', { name: 'Add Movie' }))
    expect(mockNavigate).toHaveBeenCalledWith('/movies/new', {
      state: { initialTmdbQuery: 'zzznomatch' },
    })
  })

  it('does not show Add Movie button when search matches movies', async () => {
    const user = userEvent.setup()
    renderHomePage()
    await waitFor(() => screen.getAllByTestId('movie-card'))
    await user.type(screen.getByPlaceholderText('Search movies…'), 'Inception')
    expect(screen.queryByRole('button', { name: 'Add Movie' })).not.toBeInTheDocument()
  })

  it('Reset Filter button restores all movies after a filter is applied', async () => {
    const user = userEvent.setup()
    renderHomePage()
    await waitFor(() => screen.getAllByTestId('movie-card'))
    // open filter dropdown and select Watched
    await user.click(screen.getByLabelText('Filter by watch status'))
    await user.click(screen.getByText('Watched'))
    // both movies are WatchStatus.WATCHED so still visible — but verify reset works
    await user.click(screen.getByLabelText('Filter by watch status'))
    await user.click(screen.getByRole('button', { name: 'Reset Filter' }))
    // dropdown should close and all movies still shown
    expect(screen.queryByText('Reset Filter')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('movie-card')).toHaveLength(2)
  })

  it('Reset Sort button closes the sort dropdown', async () => {
    const user = userEvent.setup()
    renderHomePage()
    await waitFor(() => screen.getAllByTestId('movie-card'))
    await user.click(screen.getByLabelText('Sort movies'))
    await user.click(screen.getByRole('button', { name: 'Reset Sort' }))
    expect(screen.queryByText('Reset Sort')).not.toBeInTheDocument()
  })

  it('navigates to add movie on FAB click', async () => {
    const user = userEvent.setup()
    renderHomePage()
    await waitFor(() => screen.getAllByTestId('movie-card'))
    await user.click(screen.getByLabelText('Add movie'))
    expect(mockNavigate).toHaveBeenCalledWith('/movies/new', expect.anything())
  })

  it('shows first page of movies when count exceeds page size', async () => {
    const firstPage = Array.from({ length: 25 }, (_, i) => fakeMovie(`m${i}`, `Movie ${i}`))
    mockGetMoviesPage.mockResolvedValue({ movies: firstPage, lastDoc: {}, hasMore: true })
    renderHomePage()
    await waitFor(() => expect(screen.getAllByTestId('movie-card')).toHaveLength(25))
  })
})
