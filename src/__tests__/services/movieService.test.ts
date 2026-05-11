import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Timestamp } from 'firebase/firestore'
import { WatchStatus } from '../../types'

class MockTimestamp {
  seconds: number
  nanoseconds: number
  constructor(s: number, n: number) {
    this.seconds = s
    this.nanoseconds = n
  }
  static now() { return new MockTimestamp(1000, 0) }
}

const mockGetDoc = vi.fn()
const mockGetDocs = vi.fn()
const mockAddDoc = vi.fn()
const mockSetDoc = vi.fn()
const mockDeleteDoc = vi.fn()
const mockOnSnapshot = vi.fn()
const mockCollection = vi.fn()
const mockDoc = vi.fn()
const mockQuery = vi.fn()
const mockWhere = vi.fn()
const mockWriteBatch = vi.fn()
const mockBatchUpdate = vi.fn()
const mockBatchCommit = vi.fn()

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  query: (...args: unknown[]) => mockQuery(...args),
  where: (...args: unknown[]) => mockWhere(...args),
  writeBatch: (...args: unknown[]) => mockWriteBatch(...args),
  Timestamp: MockTimestamp,
}))

vi.mock('../../firebase', () => ({ auth: {}, db: {} }))

const { subscribeToMoviesForList, subscribeToAllMovies, getMovie, addMovie, updateMovie, deleteMovie, removeListFromAllMovies } =
  await import('../../services/movieService')

const fakeTs = new MockTimestamp(1000, 0) as unknown as Timestamp

function makeDoc(id: string, data: Record<string, unknown>) {
  return { id, data: () => data, ref: { id } }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCollection.mockReturnValue('moviesRef')
  mockDoc.mockReturnValue('docRef')
  mockQuery.mockReturnValue('queryRef')
  mockWhere.mockReturnValue('whereRef')
  mockWriteBatch.mockReturnValue({ update: mockBatchUpdate, commit: mockBatchCommit })
  mockBatchCommit.mockResolvedValue(undefined)
  mockGetDocs.mockResolvedValue({ empty: true, docs: [] })
})

describe('subscribeToMoviesForList', () => {
  it('maps snapshot docs to Movie objects', () => {
    const unsub = vi.fn()
    mockOnSnapshot.mockImplementation((_ref, onNext) => {
      onNext({
        docs: [
          makeDoc('m1', {
            title: 'Inception',
            year: 2010,
            genre: 'Sci-Fi',
            status: WatchStatus.WATCHED,
            rating: 5,
            description: 'Dreams',
            notes: 'Great',
            trailerUrl: 'https://yt.com/watch?v=abc',
            posterUrl: 'https://img.com/poster.jpg',
            listIds: ['list1'],
            createdAt: fakeTs,
          }),
        ],
      })
      return unsub
    })

    const onData = vi.fn()
    const result = subscribeToMoviesForList('uid1', 'list1', onData)

    expect(onData).toHaveBeenCalledWith([
      {
        id: 'm1',
        title: 'Inception',
        year: '2010',
        genre: 'Sci-Fi',
        status: WatchStatus.WATCHED,
        rating: 5,
        description: 'Dreams',
        notes: 'Great',
        trailerUrl: 'https://yt.com/watch?v=abc',
        posterUrl: 'https://img.com/poster.jpg',
        listIds: ['list1'],
        createdAt: fakeTs,
      },
    ])
    expect(result).toBe(unsub)
  })

  it('defaults to WANT_TO_WATCH for invalid status', () => {
    mockOnSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ docs: [makeDoc('m2', { status: 'INVALID_STATUS' })] })
      return vi.fn()
    })
    const onData = vi.fn()
    subscribeToMoviesForList('uid1', 'list1', onData)
    expect(onData.mock.calls[0][0][0].status).toBe(WatchStatus.WANT_TO_WATCH)
  })

  it('defaults to WANT_TO_WATCH when status is missing', () => {
    mockOnSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ docs: [makeDoc('m3', {})] })
      return vi.fn()
    })
    const onData = vi.fn()
    subscribeToMoviesForList('uid1', 'list1', onData)
    expect(onData.mock.calls[0][0][0].status).toBe(WatchStatus.WANT_TO_WATCH)
  })

  it('converts numeric year to string', () => {
    mockOnSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ docs: [makeDoc('m4', { year: 1999 })] })
      return vi.fn()
    })
    const onData = vi.fn()
    subscribeToMoviesForList('uid1', 'list1', onData)
    expect(onData.mock.calls[0][0][0].year).toBe('1999')
  })

  it('defaults string fields to empty string when missing', () => {
    mockOnSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ docs: [makeDoc('m5', {})] })
      return vi.fn()
    })
    const onData = vi.fn()
    subscribeToMoviesForList('uid1', 'list1', onData)
    const movie = onData.mock.calls[0][0][0]
    expect(movie.title).toBe('')
    expect(movie.genre).toBe('')
    expect(movie.description).toBe('')
    expect(movie.notes).toBe('')
    expect(movie.trailerUrl).toBe('')
    expect(movie.posterUrl).toBe('')
    expect(movie.year).toBe('')
    expect(movie.rating).toBeNull()
    expect(movie.listIds).toEqual([])
  })

  it('filters non-string values from listIds', () => {
    mockOnSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ docs: [makeDoc('m6', { listIds: ['a', 123, null, 'b'] })] })
      return vi.fn()
    })
    const onData = vi.fn()
    subscribeToMoviesForList('uid1', 'list1', onData)
    expect(onData.mock.calls[0][0][0].listIds).toEqual(['a', 'b'])
  })

  it('falls back to Timestamp.now() when createdAt is not a Timestamp instance', () => {
    mockOnSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ docs: [makeDoc('m7', { createdAt: 'not-a-timestamp' })] })
      return vi.fn()
    })
    const onData = vi.fn()
    subscribeToMoviesForList('uid1', 'list1', onData)
    const movie = onData.mock.calls[0][0][0]
    expect(movie.createdAt).toBeInstanceOf(MockTimestamp)
  })

  it('calls onError on snapshot error', () => {
    const err = new Error('permission denied')
    mockOnSnapshot.mockImplementation((_ref, _onNext, onErr) => {
      onErr(err)
      return vi.fn()
    })
    const onError = vi.fn()
    subscribeToMoviesForList('uid1', 'list1', vi.fn(), onError)
    expect(onError).toHaveBeenCalledWith(err)
  })
})

describe('subscribeToAllMovies', () => {
  it('maps all docs to Movie objects without list filter', () => {
    const unsub = vi.fn()
    mockOnSnapshot.mockImplementation((_ref, onNext) => {
      onNext({
        docs: [
          makeDoc('m1', { title: 'Inception', year: 2010, genre: 'Sci-Fi', status: 'WATCHED', rating: 5,
            description: '', notes: '', trailerUrl: '', posterUrl: '', listIds: ['list1'], createdAt: fakeTs }),
          makeDoc('m2', { title: 'Dune', year: 2021, genre: 'Sci-Fi', status: 'WANT_TO_WATCH', rating: null,
            description: '', notes: '', trailerUrl: '', posterUrl: '', listIds: ['list2'], createdAt: fakeTs }),
        ],
      })
      return unsub
    })
    const onData = vi.fn()
    const result = subscribeToAllMovies('uid1', onData)
    expect(onData).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'm1', title: 'Inception' }),
        expect.objectContaining({ id: 'm2', title: 'Dune' }),
      ]),
    )
    expect(result).toBe(unsub)
  })

  it('calls onError on snapshot error', () => {
    const err = new Error('permission denied')
    mockOnSnapshot.mockImplementation((_ref, _onNext, onErr) => {
      onErr(err)
      return vi.fn()
    })
    const onError = vi.fn()
    subscribeToAllMovies('uid1', vi.fn(), onError)
    expect(onError).toHaveBeenCalledWith(err)
  })
})

describe('addMovie', () => {
  it('calls addDoc and returns new id', async () => {
    mockAddDoc.mockResolvedValue({ id: 'newMovieId' })
    const id = await addMovie('uid1', {
      title: 'Dune',
      year: '2021',
      genre: 'Sci-Fi',
      status: WatchStatus.WANT_TO_WATCH,
      rating: null,
      description: '',
      notes: '',
      trailerUrl: '',
      posterUrl: '',
      listIds: ['list1'],
    })
    expect(mockAddDoc).toHaveBeenCalledWith('moviesRef', expect.objectContaining({ title: 'Dune' }))
    expect(id).toBe('newMovieId')
  })

  it('converts non-empty year to number in stored data', async () => {
    mockAddDoc.mockResolvedValue({ id: 'x' })
    await addMovie('uid1', {
      title: 'Test',
      year: '2023',
      genre: '',
      status: WatchStatus.WANT_TO_WATCH,
      rating: null,
      description: '',
      notes: '',
      trailerUrl: '',
      posterUrl: '',
      listIds: [],
    })
    expect(mockAddDoc.mock.calls[0][1].year).toBe(2023)
  })

  it('stores null for empty year', async () => {
    mockAddDoc.mockResolvedValue({ id: 'x' })
    await addMovie('uid1', {
      title: 'Test',
      year: '',
      genre: '',
      status: WatchStatus.WANT_TO_WATCH,
      rating: null,
      description: '',
      notes: '',
      trailerUrl: '',
      posterUrl: '',
      listIds: [],
    })
    expect(mockAddDoc.mock.calls[0][1].year).toBeNull()
  })
})

describe('updateMovie', () => {
  it('calls setDoc with movie data', async () => {
    mockSetDoc.mockResolvedValue(undefined)
    await updateMovie('uid1', {
      id: 'movie1',
      title: 'Updated',
      year: '2020',
      genre: 'Drama',
      status: WatchStatus.WATCHED,
      rating: 4,
      description: 'desc',
      notes: 'notes',
      trailerUrl: 'url',
      posterUrl: 'poster',
      listIds: ['l1'],
      createdAt: fakeTs,
    })
    expect(mockSetDoc).toHaveBeenCalledWith('docRef', expect.objectContaining({ title: 'Updated' }))
  })
})

describe('deleteMovie', () => {
  it('calls deleteDoc', async () => {
    mockDeleteDoc.mockResolvedValue(undefined)
    await deleteMovie('uid1', 'movieId')
    expect(mockDeleteDoc).toHaveBeenCalledWith('docRef')
  })
})

describe('getMovie', () => {
  it('returns null when doc does not exist', async () => {
    mockGetDoc.mockResolvedValue({ exists: () => false })
    const result = await getMovie('uid1', 'missing')
    expect(result).toBeNull()
  })

  it('returns a mapped Movie when doc exists', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      id: 'm1',
      data: () => ({
        title: 'Inception',
        year: 2010,
        genre: 'Sci-Fi',
        status: WatchStatus.WATCHED,
        rating: 5,
        description: 'Dreams',
        notes: 'Great',
        trailerUrl: 'https://yt.com/watch?v=abc',
        posterUrl: 'https://img.com/poster.jpg',
        listIds: ['list1'],
        createdAt: fakeTs,
      }),
    })
    const movie = await getMovie('uid1', 'm1')
    expect(movie).not.toBeNull()
    expect(movie?.title).toBe('Inception')
    expect(movie?.year).toBe('2010')
    expect(movie?.status).toBe(WatchStatus.WATCHED)
  })
})

describe('removeListFromAllMovies', () => {
  it('skips batch when snapshot is empty', async () => {
    mockGetDocs.mockResolvedValue({ empty: true, docs: [] })
    await removeListFromAllMovies('uid1', 'listId')
    expect(mockWriteBatch).not.toHaveBeenCalled()
  })

  it('batch-updates all matching movies to remove listId', async () => {
    const doc1 = { ref: 'ref1', data: () => ({ listIds: ['listId', 'other'] }) }
    const doc2 = { ref: 'ref2', data: () => ({ listIds: ['listId'] }) }
    mockGetDocs.mockResolvedValue({ empty: false, docs: [doc1, doc2] })
    await removeListFromAllMovies('uid1', 'listId')
    expect(mockBatchUpdate).toHaveBeenCalledWith('ref1', { listIds: ['other'] })
    expect(mockBatchUpdate).toHaveBeenCalledWith('ref2', { listIds: [] })
    expect(mockBatchCommit).toHaveBeenCalled()
  })

  it('handles non-array listIds in doc gracefully', async () => {
    const doc1 = { ref: 'ref1', data: () => ({ listIds: null }) }
    mockGetDocs.mockResolvedValue({ empty: false, docs: [doc1] })
    await removeListFromAllMovies('uid1', 'listId')
    expect(mockBatchUpdate).toHaveBeenCalledWith('ref1', { listIds: [] })
  })
})
