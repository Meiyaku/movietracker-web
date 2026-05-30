import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timestamp } from 'firebase/firestore'
import { MovieDetailEditContent } from '../../components/MovieDetailEditContent'
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
  status: WatchStatus.WANT_TO_WATCH,
  rating: null,
  description: '',
  notes: '',
  trailerUrl: '',
  posterUrl: '',
  listIds: ['list0'],
  createdAt: ts,
  tmdbId: null,
  tmdbMediaType: null,
  tmdbLookupAttempted: false,
}

const lists: MovieList[] = [
  { id: 'list0', name: MY_MOVIES_LIST_NAME, createdAt: ts },
  { id: 'list1', name: 'Watchlist', createdAt: ts },
]

const defaultProps = {
  editMovie: baseMovie,
  lists,
  isNew: true,
  saving: false,
  deleting: false,
  yearError: null,
  tmdbEnabled: true,
  onChange: vi.fn(),
  onSave: vi.fn(),
  onCancel: vi.fn(),
  onShowTmdb: vi.fn(),
  onShowDeleteConfirm: vi.fn(),
}

describe('MovieDetailEditContent', () => {
  it('renders the TMDB search button', () => {
    render(<MovieDetailEditContent {...defaultProps} />)
    expect(screen.getByText(/Search TMDB/i)).toBeInTheDocument()
  })

  it('renders the title input with current value', () => {
    render(<MovieDetailEditContent {...defaultProps} />)
    expect(screen.getByPlaceholderText('Movie title')).toHaveValue('Inception')
  })

  it('calls onShowTmdb when TMDB button is clicked', async () => {
    const onShowTmdb = vi.fn()
    const user = userEvent.setup()
    render(<MovieDetailEditContent {...defaultProps} onShowTmdb={onShowTmdb} />)
    await user.click(screen.getByText(/Search TMDB/i))
    expect(onShowTmdb).toHaveBeenCalled()
  })

  it('calls onChange when title input changes', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<MovieDetailEditContent {...defaultProps} onChange={onChange} />)
    const input = screen.getByPlaceholderText('Movie title')
    await user.type(input, '!')
    expect(onChange).toHaveBeenCalled()
  })

  it('calls onSave when Save button is clicked', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()
    render(<MovieDetailEditContent {...defaultProps} onSave={onSave} />)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalled()
  })

  it('calls onCancel when Cancel button is clicked', async () => {
    const onCancel = vi.fn()
    const user = userEvent.setup()
    render(<MovieDetailEditContent {...defaultProps} onCancel={onCancel} />)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
  })

  it('disables Save when title is empty', () => {
    render(
      <MovieDetailEditContent
        {...defaultProps}
        editMovie={{ ...baseMovie, title: '' }}
      />,
    )
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('does not show Delete Movie button when isNew is true', () => {
    render(<MovieDetailEditContent {...defaultProps} isNew={true} />)
    expect(screen.queryByText(/Delete Movie/i)).not.toBeInTheDocument()
  })

  it('shows Delete Movie button when isNew is false', () => {
    render(<MovieDetailEditContent {...defaultProps} isNew={false} />)
    expect(screen.getByRole('button', { name: /Delete Movie/i })).toBeInTheDocument()
  })

  it('calls onShowDeleteConfirm when Delete Movie button is clicked', async () => {
    const onShowDeleteConfirm = vi.fn()
    const user = userEvent.setup()
    render(
      <MovieDetailEditContent
        {...defaultProps}
        isNew={false}
        onShowDeleteConfirm={onShowDeleteConfirm}
      />,
    )
    await user.click(screen.getByRole('button', { name: /Delete Movie/i }))
    expect(onShowDeleteConfirm).toHaveBeenCalled()
  })

  it('renders list checkboxes', () => {
    render(<MovieDetailEditContent {...defaultProps} />)
    expect(screen.getByLabelText(new RegExp(MY_MOVIES_LIST_NAME))).toBeInTheDocument()
    expect(screen.getByLabelText(/Watchlist/)).toBeInTheDocument()
  })

  it('My Movies checkbox is disabled', () => {
    render(<MovieDetailEditContent {...defaultProps} />)
    const myMoviesCheckbox = screen.getByLabelText(new RegExp(MY_MOVIES_LIST_NAME))
    expect(myMoviesCheckbox).toBeDisabled()
  })
})
