import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchMovies, getTrailerUrl, getThumbnailUrl, getPosterUrl } from '../../services/tmdbService'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function ok(body: unknown) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response)
}

function fail(status: number) {
  return Promise.resolve({ ok: false, status } as Response)
}

beforeEach(() => {
  mockFetch.mockReset()
})

describe('searchMovies', () => {
  it('maps results correctly', async () => {
    mockFetch.mockReturnValueOnce(
      ok({
        results: [
          { id: 1, title: 'Inception', release_date: '2010-07-16', overview: 'Dreams', poster_path: '/abc.jpg' },
          { id: 2, original_title: 'No Title', release_date: null, overview: null, poster_path: null },
        ],
      }),
    )

    const results = await searchMovies('Inception')

    expect(results).toHaveLength(2)
    expect(results[0]).toEqual({
      id: 1,
      title: 'Inception',
      releaseDate: '2010-07-16',
      overview: 'Dreams',
      posterPath: '/abc.jpg',
    })
    expect(results[1]).toEqual({
      id: 2,
      title: 'No Title',
      releaseDate: null,
      overview: null,
      posterPath: null,
    })
  })

  it('uses original_title when title is missing', async () => {
    mockFetch.mockReturnValueOnce(
      ok({ results: [{ id: 3, original_title: 'Parasite', release_date: '2019-05-30' }] }),
    )
    const results = await searchMovies('Parasite')
    expect(results[0].title).toBe('Parasite')
  })

  it('falls back to empty string when both title fields are missing', async () => {
    mockFetch.mockReturnValueOnce(ok({ results: [{ id: 4 }] }))
    const results = await searchMovies('?')
    expect(results[0].title).toBe('')
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockReturnValueOnce(fail(401))
    await expect(searchMovies('test')).rejects.toThrow('TMDB search failed: 401')
  })

  it('encodes query in URL', async () => {
    mockFetch.mockReturnValueOnce(ok({ results: [] }))
    await searchMovies('hello world')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('query=hello%20world'),
      expect.anything(),
    )
  })
})

describe('getTrailerUrl', () => {
  it('returns official YouTube trailer URL', async () => {
    mockFetch.mockReturnValueOnce(
      ok({
        results: [
          { key: 'abc123', site: 'YouTube', type: 'Trailer', official: true },
          { key: 'xyz', site: 'Vimeo', type: 'Trailer', official: true },
        ],
      }),
    )
    const url = await getTrailerUrl(1)
    expect(url).toBe('https://www.youtube.com/watch?v=abc123')
  })

  it('falls back to non-official YouTube trailer', async () => {
    mockFetch.mockReturnValueOnce(
      ok({
        results: [{ key: 'xyz789', site: 'YouTube', type: 'Trailer', official: false }],
      }),
    )
    const url = await getTrailerUrl(2)
    expect(url).toBe('https://www.youtube.com/watch?v=xyz789')
  })

  it('returns null when no YouTube trailers', async () => {
    mockFetch.mockReturnValueOnce(ok({ results: [] }))
    const url = await getTrailerUrl(3)
    expect(url).toBeNull()
  })

  it('returns null when only non-trailer videos', async () => {
    mockFetch.mockReturnValueOnce(
      ok({ results: [{ key: 'k', site: 'YouTube', type: 'Teaser', official: true }] }),
    )
    const url = await getTrailerUrl(4)
    expect(url).toBeNull()
  })

  it('throws on non-ok response', async () => {
    mockFetch.mockReturnValueOnce(fail(404))
    await expect(getTrailerUrl(999)).rejects.toThrow('TMDB videos failed: 404')
  })
})

describe('getThumbnailUrl', () => {
  it('returns w92 image URL', () => {
    expect(getThumbnailUrl('/poster.jpg')).toBe('https://image.tmdb.org/t/p/w92/poster.jpg')
  })
})

describe('getPosterUrl', () => {
  it('returns w500 image URL', () => {
    expect(getPosterUrl('/poster.jpg')).toBe('https://image.tmdb.org/t/p/w500/poster.jpg')
  })
})
