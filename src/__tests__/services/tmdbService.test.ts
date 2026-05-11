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
  it('maps movie results correctly', async () => {
    mockFetch.mockReturnValueOnce(
      ok({
        results: [
          {
            id: 1,
            media_type: 'movie',
            title: 'Inception',
            release_date: '2010-07-16',
            overview: 'Dreams',
            poster_path: '/abc.jpg',
            vote_average: 8.4,
            genre_ids: [878, 28],
          },
        ],
      }),
    )
    const results = await searchMovies('Inception')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      id: 1,
      mediaType: 'movie',
      title: 'Inception',
      name: null,
      releaseDate: '2010-07-16',
      firstAirDate: null,
      overview: 'Dreams',
      posterPath: '/abc.jpg',
      voteAverage: 8.4,
    })
    expect(results[0].genre).toContain('Science Fiction')
    expect(results[0].genre).toContain('Action')
  })

  it('maps TV show results correctly', async () => {
    mockFetch.mockReturnValueOnce(
      ok({
        results: [
          {
            id: 2,
            media_type: 'tv',
            name: 'Breaking Bad',
            first_air_date: '2008-01-20',
            overview: 'Chemistry teacher',
            poster_path: '/bb.jpg',
            vote_average: 9.5,
            genre_ids: [18],
          },
        ],
      }),
    )
    const results = await searchMovies('Breaking Bad')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      id: 2,
      mediaType: 'tv',
      title: null,
      name: 'Breaking Bad',
      firstAirDate: '2008-01-20',
      releaseDate: null,
    })
  })

  it('filters out non-movie/tv results', async () => {
    mockFetch.mockReturnValueOnce(
      ok({
        results: [
          { id: 1, media_type: 'person', name: 'Brad Pitt' },
          { id: 2, media_type: 'movie', title: 'Fight Club', release_date: '1999-10-15', genre_ids: [] },
        ],
      }),
    )
    const results = await searchMovies('Brad Pitt')
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe(2)
  })

  it('sets genre to null when no genre_ids', async () => {
    mockFetch.mockReturnValueOnce(
      ok({ results: [{ id: 3, media_type: 'movie', title: 'Unknown' }] }),
    )
    const results = await searchMovies('Unknown')
    expect(results[0].genre).toBeNull()
  })

  it('uses search/multi endpoint', async () => {
    mockFetch.mockReturnValueOnce(ok({ results: [] }))
    await searchMovies('test')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('search/multi'),
      expect.anything(),
    )
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

  it('uses movie path by default', async () => {
    mockFetch.mockReturnValueOnce(ok({ results: [] }))
    await getTrailerUrl(1)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/movie/1/videos'),
      expect.anything(),
    )
  })

  it('uses tv path for TV media type', async () => {
    mockFetch.mockReturnValueOnce(ok({ results: [] }))
    await getTrailerUrl(1, 'tv')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/tv/1/videos'),
      expect.anything(),
    )
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
