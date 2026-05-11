import { Movie, MovieList, WatchStatus, MY_MOVIES_LIST_NAME } from '../types'
import { StarRatingPicker } from './StarRatingPicker'

interface Props {
  editMovie: Movie
  lists: MovieList[]
  isNew: boolean
  saving: boolean
  deleting: boolean
  yearError: string | null
  tmdbEnabled: boolean
  onChange: (movie: Movie) => void
  onSave: () => void
  onCancel: () => void
  onShowTmdb: () => void
  onShowDeleteConfirm: () => void
}

export function MovieDetailEditContent({
  editMovie, lists, isNew, saving, deleting, yearError, tmdbEnabled,
  onChange, onSave, onCancel, onShowTmdb, onShowDeleteConfirm,
}: Props) {
  function toggleListId(listId: string) {
    const myMoviesList = lists.find((l) => l.name === MY_MOVIES_LIST_NAME)
    if (listId === myMoviesList?.id) return
    const has = editMovie.listIds.includes(listId)
    onChange({
      ...editMovie,
      listIds: has
        ? editMovie.listIds.filter((id) => id !== listId)
        : [...editMovie.listIds, listId],
    })
  }

  return (
    <div className="space-y-4">
      {tmdbEnabled && (
        <button
          onClick={onShowTmdb}
          className="w-full py-2.5 border-2 border-dashed border-blue-400 dark:border-blue-600 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors"
        >
          Search TMDB to auto-fill details
        </button>
      )}

      {editMovie.posterUrl && (
        <div className="w-24 h-36 rounded-xl overflow-hidden shadow mx-auto">
          <img src={editMovie.posterUrl} alt="Poster" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 space-y-4">
        <div>
          <label htmlFor="movie-title" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
            Title *
          </label>
          <input
            id="movie-title"
            type="text"
            value={editMovie.title}
            onChange={(e) => onChange({ ...editMovie, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Movie title"
            maxLength={200}
          />
        </div>

        <div>
          <label htmlFor="movie-year" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
            Year
          </label>
          <input
            id="movie-year"
            type="number"
            value={editMovie.year}
            onChange={(e) => onChange({ ...editMovie, year: e.target.value })}
            className={`w-full px-3 py-2 border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${yearError ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            placeholder="e.g. 2024"
            min="1888"
            max={new Date().getFullYear() + 5}
          />
          {yearError && <p className="mt-1 text-xs text-red-500">{yearError}</p>}
        </div>

        <div>
          <label htmlFor="movie-genre" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
            Genre
          </label>
          <input
            id="movie-genre"
            type="text"
            value={editMovie.genre}
            onChange={(e) => onChange({ ...editMovie, genre: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="e.g. Action, Comedy"
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
            Status
          </label>
          <div className="flex rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600">
            {[WatchStatus.WANT_TO_WATCH, WatchStatus.WATCHED].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() =>
                  onChange({
                    ...editMovie,
                    status: s,
                    rating: s === WatchStatus.WANT_TO_WATCH ? null : editMovie.rating,
                  })
                }
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  editMovie.status === s
                    ? s === WatchStatus.WATCHED
                      ? 'bg-watched-fill text-green-900 border-watched-border'
                      : 'bg-want-fill text-white border-want-border'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {s === WatchStatus.WATCHED ? 'Watched' : 'Want to Watch'}
              </button>
            ))}
          </div>
        </div>

        {editMovie.status === WatchStatus.WATCHED && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
              Rating
            </label>
            <StarRatingPicker
              value={editMovie.rating}
              onChange={(r) => onChange({ ...editMovie, rating: r })}
            />
            {editMovie.rating != null && (
              <button
                type="button"
                onClick={() => onChange({ ...editMovie, rating: null })}
                className="mt-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Clear rating
              </button>
            )}
          </div>
        )}

        <div>
          <label htmlFor="movie-trailer" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
            Trailer URL
          </label>
          <input
            id="movie-trailer"
            type="url"
            value={editMovie.trailerUrl}
            onChange={(e) => onChange({ ...editMovie, trailerUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="https://youtube.com/watch?v=..."
          />
        </div>

        <div>
          <label htmlFor="movie-description" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
            Description
          </label>
          <textarea
            id="movie-description"
            value={editMovie.description}
            onChange={(e) => onChange({ ...editMovie, description: e.target.value })}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            placeholder="Auto-filled from TMDB search…"
          />
        </div>

        <div>
          <label htmlFor="movie-notes" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1">
            Notes
          </label>
          <textarea
            id="movie-notes"
            value={editMovie.notes}
            onChange={(e) => onChange({ ...editMovie, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
            placeholder="Your thoughts on this movie…"
          />
        </div>

        {lists.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-2">
              Lists
            </label>
            <div className="space-y-2">
              {lists.map((list) => {
                const isMyMovies = list.name === MY_MOVIES_LIST_NAME
                const checked = editMovie.listIds.includes(list.id)
                return (
                  <label
                    key={list.id}
                    className={`flex items-center gap-3 py-1 ${isMyMovies ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={isMyMovies}
                      onChange={() => toggleListId(list.id)}
                      className="w-4 h-4 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-800 dark:text-gray-200">
                      {list.name}
                      {isMyMovies && (
                        <span className="ml-1 text-xs text-gray-400">(always included)</span>
                      )}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !editMovie.title.trim() || !!yearError}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {!isNew && (
          <button
            onClick={onShowDeleteConfirm}
            disabled={deleting}
            className="w-full py-3 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl text-sm font-semibold transition-colors"
          >
            {deleting ? 'Deleting…' : 'Delete Movie'}
          </button>
        )}
      </div>
    </div>
  )
}
