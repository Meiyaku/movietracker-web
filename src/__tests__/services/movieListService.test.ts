import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Timestamp } from 'firebase/firestore'

class MockTimestamp {
  seconds: number
  nanoseconds: number
  constructor(s: number, n: number) {
    this.seconds = s
    this.nanoseconds = n
  }
  static now() { return new MockTimestamp(1000, 0) }
}

const mockAddDoc = vi.fn()
const mockDeleteDoc = vi.fn()
const mockUpdateDoc = vi.fn()
const mockOnSnapshot = vi.fn()
const mockCollection = vi.fn()
const mockDoc = vi.fn()

const mockDeleteField = vi.fn().mockReturnValue({ type: 'deleteField' })

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  deleteDoc: (...args: unknown[]) => mockDeleteDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  onSnapshot: (...args: unknown[]) => mockOnSnapshot(...args),
  deleteField: () => mockDeleteField(),
  Timestamp: MockTimestamp,
}))

vi.mock('../../firebase', () => ({ auth: {}, db: {} }))

const { subscribeToLists, createDefaultList, createList, updateList, deleteList, sortLists } =
  await import('../../services/movieListService')

const fakeTs = new MockTimestamp(1000, 0)

beforeEach(() => {
  vi.clearAllMocks()
  mockCollection.mockReturnValue('listsRef')
  mockDoc.mockReturnValue('docRef')
})

describe('subscribeToLists', () => {
  it('calls onSnapshot and maps docs to MovieList', () => {
    const unsub = vi.fn()
    mockOnSnapshot.mockImplementation((_ref, onNext) => {
      onNext({
        docs: [
          { id: 'list1', data: () => ({ name: 'My Movies', createdAt: fakeTs }) },
          { id: 'list2', data: () => ({ name: 'Watchlist' }) },
        ],
      })
      return unsub
    })

    const onData = vi.fn()
    const result = subscribeToLists('uid1', onData)

    expect(onData).toHaveBeenCalledWith([
      { id: 'list1', name: 'My Movies', createdAt: fakeTs },
      { id: 'list2', name: 'Watchlist', createdAt: expect.any(MockTimestamp) },
    ])
    expect(result).toBe(unsub)
  })

  it('defaults name to empty string when missing', () => {
    mockOnSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ docs: [{ id: 'l1', data: () => ({}) }] })
      return vi.fn()
    })
    const onData = vi.fn()
    subscribeToLists('uid1', onData)
    expect(onData.mock.calls[0][0][0].name).toBe('')
  })

  it('falls back to Timestamp.now() when createdAt is not a Timestamp', () => {
    mockOnSnapshot.mockImplementation((_ref, onNext) => {
      onNext({ docs: [{ id: 'l1', data: () => ({ createdAt: 'bad' }) }] })
      return vi.fn()
    })
    const onData = vi.fn()
    subscribeToLists('uid1', onData)
    expect(onData.mock.calls[0][0][0].createdAt).toBeInstanceOf(MockTimestamp)
  })

  it('calls onError on snapshot error', () => {
    const testError = new Error('permission denied')
    mockOnSnapshot.mockImplementation((_ref, _onNext, onErr) => {
      onErr(testError)
      return vi.fn()
    })
    const onError = vi.fn()
    subscribeToLists('uid1', vi.fn(), onError)
    expect(onError).toHaveBeenCalledWith(testError)
  })
})

describe('createDefaultList', () => {
  it('creates a list with MY_MOVIES_LIST_NAME', async () => {
    mockAddDoc.mockResolvedValue({ id: 'newId' })
    const id = await createDefaultList('uid1')
    expect(mockAddDoc).toHaveBeenCalledWith('listsRef', expect.objectContaining({ name: 'All Movies' }))
    expect(id).toBe('newId')
  })
})

describe('createList', () => {
  it('creates a list with given name', async () => {
    mockAddDoc.mockResolvedValue({ id: 'listId' })
    const id = await createList('uid1', 'Favorites')
    expect(mockAddDoc).toHaveBeenCalledWith('listsRef', expect.objectContaining({ name: 'Favorites' }))
    expect(id).toBe('listId')
  })
})

describe('updateList', () => {
  it('calls updateDoc with name and deleteField sentinels when no subtitle/description', async () => {
    mockUpdateDoc.mockResolvedValue(undefined)
    await updateList('uid1', 'listId', 'New Name', undefined, undefined)
    expect(mockUpdateDoc).toHaveBeenCalledWith('docRef', {
      name: 'New Name',
      subtitle: { type: 'deleteField' },
      description: { type: 'deleteField' },
    })
  })

  it('calls updateDoc with subtitle and description when provided', async () => {
    mockUpdateDoc.mockResolvedValue(undefined)
    await updateList('uid1', 'listId', 'New Name', 'My subtitle', 'My description')
    expect(mockUpdateDoc).toHaveBeenCalledWith('docRef', {
      name: 'New Name',
      subtitle: 'My subtitle',
      description: 'My description',
    })
  })
})

describe('deleteList', () => {
  it('calls deleteDoc', async () => {
    mockDeleteDoc.mockResolvedValue(undefined)
    await deleteList('uid1', 'listId')
    expect(mockDeleteDoc).toHaveBeenCalledWith('docRef')
  })
})

describe('sortLists', () => {
  const ts = new MockTimestamp(0, 0) as unknown as Timestamp

  it('puts All Movies first', () => {
    const lists = [
      { id: '2', name: 'Action', createdAt: ts },
      { id: '1', name: 'All Movies', createdAt: ts },
    ]
    const sorted = sortLists(lists)
    expect(sorted[0].name).toBe('All Movies')
    expect(sorted[1].name).toBe('Action')
  })

  it('sorts remaining lists alphabetically', () => {
    const lists = [
      { id: '3', name: 'Thrillers', createdAt: ts },
      { id: '1', name: 'All Movies', createdAt: ts },
      { id: '2', name: 'Action', createdAt: ts },
      { id: '4', name: 'Comedy', createdAt: ts },
    ]
    const sorted = sortLists(lists)
    expect(sorted.map((l) => l.name)).toEqual(['All Movies', 'Action', 'Comedy', 'Thrillers'])
  })

  it('handles list with no My Movies entry', () => {
    const lists = [
      { id: '2', name: 'Sci-Fi', createdAt: ts },
      { id: '1', name: 'Action', createdAt: ts },
    ]
    const sorted = sortLists(lists)
    expect(sorted.map((l) => l.name)).toEqual(['Action', 'Sci-Fi'])
  })

  it('returns empty array for empty input', () => {
    expect(sortLists([])).toEqual([])
  })
})
