import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AppDrawer } from '../../components/AppDrawer'
import { Timestamp } from 'firebase/firestore'
import { MovieList, MY_MOVIES_LIST_NAME } from '../../types'

vi.mock('firebase/firestore', () => ({
  Timestamp: { now: vi.fn(() => ({ seconds: 0, nanoseconds: 0 })) },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const mockSignOut = vi.fn()
const mockCreateList = vi.fn()
const mockUpdateList = vi.fn()
const mockDeleteList = vi.fn()
const mockRemoveListFromAllMovies = vi.fn()

vi.mock('../../services/authService', () => ({ signOut: () => mockSignOut() }))
vi.mock('../../services/movieListService', () => ({
  createList: (...args: unknown[]) => mockCreateList(...args),
  updateList: (...args: unknown[]) => mockUpdateList(...args),
  deleteList: (...args: unknown[]) => mockDeleteList(...args),
}))
vi.mock('../../services/movieService', () => ({
  removeListFromAllMovies: (...args: unknown[]) => mockRemoveListFromAllMovies(...args),
}))

const mockUser = { uid: 'uid1', email: 'user@test.com' }
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}))

const ts = { seconds: 0, nanoseconds: 0 } as unknown as Timestamp

const myMoviesList: MovieList = { id: 'list0', name: MY_MOVIES_LIST_NAME, createdAt: ts }
const customList: MovieList = { id: 'list1', name: 'Watchlist', createdAt: ts }

const defaultProps = {
  lists: [myMoviesList, customList],
  activeListId: 'list0',
  onSelectList: vi.fn(),
  onClose: vi.fn(),
  movieCounts: undefined as Record<string, number> | undefined,
}

function renderDrawer(props = defaultProps) {
  return render(
    <MemoryRouter>
      <AppDrawer {...props} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSignOut.mockResolvedValue(undefined)
  mockCreateList.mockResolvedValue('newListId')
  mockUpdateList.mockResolvedValue(undefined)
  mockDeleteList.mockResolvedValue(undefined)
  mockRemoveListFromAllMovies.mockResolvedValue(undefined)
})

describe('AppDrawer', () => {
  it('renders Movie Tracker heading', () => {
    renderDrawer()
    expect(screen.getByText('Movie Tracker')).toBeInTheDocument()
  })

  it('shows user email', () => {
    renderDrawer()
    expect(screen.getByText('user@test.com')).toBeInTheDocument()
  })

  it('renders all lists', () => {
    renderDrawer()
    expect(screen.getByText(MY_MOVIES_LIST_NAME)).toBeInTheDocument()
    expect(screen.getByText('Watchlist')).toBeInTheDocument()
  })

  it('calls onSelectList when a list is clicked', async () => {
    const onSelectList = vi.fn()
    const user = userEvent.setup()
    renderDrawer({ ...defaultProps, onSelectList })
    await user.click(screen.getByText('Watchlist'))
    expect(onSelectList).toHaveBeenCalledWith('list1')
  })

  it('calls onClose when a list is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderDrawer({ ...defaultProps, onClose })
    await user.click(screen.getByText('Watchlist'))
    expect(onClose).toHaveBeenCalled()
  })

  it('does not show edit/delete for My Movies', () => {
    renderDrawer()
    // My Movies should have no edit/delete title buttons
    // The buttons exist only for non-My-Movies entries
    const editButtons = screen.queryAllByTitle('Edit')
    const deleteButtons = screen.queryAllByTitle('Delete')
    // For 1 custom list, there should be exactly 1 edit and 1 delete
    expect(editButtons).toHaveLength(1)
    expect(deleteButtons).toHaveLength(1)
  })

  it('navigates to settings on Settings click', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByText('Settings'))
    expect(mockNavigate).toHaveBeenCalledWith('/settings')
  })

  it('signs out and navigates to /auth on Log Out click', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByText('Log Out'))
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled())
    expect(mockNavigate).toHaveBeenCalledWith('/auth')
  })

  it('opens CreateListDialog when New List is clicked', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByText('New List'))
    expect(screen.getByText('New List', { selector: 'h2' })).toBeInTheDocument()
  })

  it('creates a list via the dialog', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByText('New List'))
    await user.type(screen.getByPlaceholderText('List name'), 'Action')
    await user.click(screen.getByText('Create'))
    await waitFor(() => expect(mockCreateList).toHaveBeenCalledWith('uid1', 'Action', undefined, undefined))
  })

  it('opens EditListDialog when Edit button is clicked', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByTitle('Edit'))
    expect(screen.getByText('Edit List')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Watchlist')).toBeInTheDocument()
  })

  it('edits a list via the dialog', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByTitle('Edit'))
    const input = screen.getByDisplayValue('Watchlist')
    await user.clear(input)
    await user.type(input, 'New Name')
    await user.click(screen.getByText('Save'))
    await waitFor(() => expect(mockUpdateList).toHaveBeenCalledWith('uid1', 'list1', 'New Name', undefined, undefined))
  })

  it('opens DeleteListDialog when Delete button is clicked', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByTitle('Delete'))
    expect(screen.getByText('Delete List')).toBeInTheDocument()
    expect(screen.getByText(/"Watchlist"/)).toBeInTheDocument()
  })

  it('deletes list and removes from movies via the dialog', async () => {
    const user = userEvent.setup()
    renderDrawer()
    await user.click(screen.getByTitle('Delete'))
    await user.click(screen.getByText('Delete'))
    await waitFor(() => {
      expect(mockRemoveListFromAllMovies).toHaveBeenCalledWith('uid1', 'list1')
      expect(mockDeleteList).toHaveBeenCalledWith('uid1', 'list1')
    })
  })

  it('selects My Movies when the deleted list was active', async () => {
    const onSelectList = vi.fn()
    const user = userEvent.setup()
    renderDrawer({ ...defaultProps, activeListId: 'list1', onSelectList })
    await user.click(screen.getByTitle('Delete'))
    await user.click(screen.getByText('Delete'))
    await waitFor(() => expect(onSelectList).toHaveBeenCalledWith('list0'))
  })

  it('shows movie count next to each list when movieCounts is provided', () => {
    renderDrawer({ ...defaultProps, movieCounts: { list0: 12, list1: 3 } })
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('shows 0 for a list with no entry in movieCounts', () => {
    renderDrawer({ ...defaultProps, movieCounts: {} })
    expect(screen.getAllByText('0')).toHaveLength(2)
  })

  it('shows no count badges when movieCounts is not provided', () => {
    renderDrawer()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('calls onClose when overlay is clicked', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderDrawer({ ...defaultProps, onClose })
    // The overlay is the div with bg-black/40
    const overlay = document.querySelector('.bg-black\\/40') as HTMLElement
    await user.click(overlay)
    expect(onClose).toHaveBeenCalled()
  })
})
