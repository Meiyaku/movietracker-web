import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useMainScreen } from '../context/MainScreenContext'
import { subscribeToLists, sortLists, createList, updateList, deleteList } from '../services/movieListService'
import { subscribeToAllMovies, removeListFromAllMovies } from '../services/movieService'
import { recordError } from '../services/logger'
import { Movie, MovieList, MainScreen, MY_MOVIES_LIST_NAME } from '../types'
import { useOnlineStatus } from './useOnlineStatus'
import { ACTIVE_LIST_KEY } from './useHomeMovies'

export type ListSort = 'NAME_ASC' | 'NAME_DESC' | 'COUNT_DESC' | 'COUNT_ASC'

export interface MyLists {
  lists: MovieList[]
  sortedLists: MovieList[]
  loading: boolean
  movieCounts: Record<string, number>
  countsReady: boolean
  searchQuery: string
  setSearchQuery: (q: string) => void
  sortOrder: ListSort
  setSortOrder: (o: ListSort) => void
  openListInMovies: (id: string) => void
  openMovies: () => void
  createList: (name: string, subtitle: string | undefined, description: string | undefined) => Promise<void>
  editList: (
    list: MovieList,
    name: string,
    subtitle: string | undefined,
    description: string | undefined,
  ) => Promise<void>
  deleteList: (list: MovieList) => Promise<void>
}

/**
 * Owns the data layer for the My Lists screen: the list and movie subscriptions,
 * movie-count aggregation, search/sort, and list create/edit/delete actions.
 */
export function useMyLists(): MyLists {
  const { user } = useAuth()
  const { openMainScreen } = useMainScreen()
  const online = useOnlineStatus()

  const [lists, setLists] = useState<MovieList[]>([])
  const [loading, setLoading] = useState(true)
  const [allMovies, setAllMovies] = useState<Movie[]>([])
  const [countsReady, setCountsReady] = useState(false)
  const [sortOrder, setSortOrder] = useState<ListSort>('NAME_ASC')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!user) return
    const unsub = subscribeToLists(
      user.uid,
      (incoming) => {
        setLists(sortLists(incoming))
        setLoading(false)
      },
      (err) => {
        recordError(err, 'subscribeToLists')
        setLoading(false)
      },
    )
    return unsub
  }, [user])

  useEffect(() => {
    if (!user) return
    return subscribeToAllMovies(
      user.uid,
      (movies) => {
        setAllMovies(movies)
        setCountsReady(true)
      },
      (err) => recordError(err, 'subscribeToAllMovies'),
    )
  }, [user])

  const movieCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allMovies.forEach((m) => {
      m.listIds.forEach((id) => {
        counts[id] = (counts[id] ?? 0) + 1
      })
    })
    return counts
  }, [allMovies])

  const sortedLists = useMemo(() => {
    const byName = (a: MovieList, b: MovieList) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    const q = searchQuery.trim().toLowerCase()
    const matching = q ? lists.filter((l) => l.name.toLowerCase().includes(q)) : lists
    // The default list is always pinned at the top, regardless of sort.
    const defaults = matching.filter((l) => l.name === MY_MOVIES_LIST_NAME)
    const others = matching.filter((l) => l.name !== MY_MOVIES_LIST_NAME)
    let sortedOthers: MovieList[]
    if (sortOrder === 'NAME_ASC') {
      sortedOthers = [...others].sort(byName)
    } else if (sortOrder === 'NAME_DESC') {
      sortedOthers = [...others].sort((a, b) => byName(b, a))
    } else {
      const dir = sortOrder === 'COUNT_ASC' ? 1 : -1
      sortedOthers = [...others].sort(
        (a, b) => dir * ((movieCounts[a.id] ?? 0) - (movieCounts[b.id] ?? 0)) || byName(a, b),
      )
    }
    return [...defaults, ...sortedOthers]
  }, [lists, movieCounts, sortOrder, searchQuery])

  function openListInMovies(id: string) {
    localStorage.setItem(ACTIVE_LIST_KEY, id)
    openMainScreen(MainScreen.MOVIES)
  }

  function openMovies() {
    openMainScreen(MainScreen.MOVIES)
  }

  async function handleCreateList(
    name: string,
    subtitle: string | undefined,
    description: string | undefined,
  ) {
    if (!user) return
    if (!online) throw new Error('No internet connection.')
    if (lists.some((l) => l.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`A list named "${name}" already exists.`)
    }
    await createList(user.uid, name, subtitle, description)
  }

  async function handleEditList(
    list: MovieList,
    name: string,
    subtitle: string | undefined,
    description: string | undefined,
  ) {
    if (!user) return
    if (!online) throw new Error('No internet connection.')
    if (lists.some((l) => l.id !== list.id && l.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`A list named "${name}" already exists.`)
    }
    await updateList(user.uid, list.id, name, subtitle, description)
  }

  async function handleDeleteList(list: MovieList) {
    if (!user) return
    if (!online) throw new Error('No internet connection.')
    await removeListFromAllMovies(user.uid, list.id)
    await deleteList(user.uid, list.id)
  }

  return {
    lists,
    sortedLists,
    loading,
    movieCounts,
    countsReady,
    searchQuery,
    setSearchQuery,
    sortOrder,
    setSortOrder,
    openListInMovies,
    openMovies,
    createList: handleCreateList,
    editList: handleEditList,
    deleteList: handleDeleteList,
  }
}
