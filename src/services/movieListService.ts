import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  writeBatch,
  Timestamp,
  QuerySnapshot,
  deleteField,
} from 'firebase/firestore'
import { db } from '../firebase'
import { MovieList, MY_MOVIES_LIST_NAME } from '../types'
import { recordError } from './logger'

function listsCollection(uid: string) {
  return collection(db, 'users', uid, 'lists')
}

export function subscribeToLists(
  uid: string,
  onData: (lists: MovieList[]) => void,
  onError?: (err: Error) => void,
): () => void {
  return onSnapshot(
    listsCollection(uid),
    (snapshot: QuerySnapshot) => {
      const lists: MovieList[] = snapshot.docs.map((d) => {
        const data = d.data()
        return {
          id: d.id,
          name: data.name ?? '',
          subtitle: data.subtitle ?? undefined,
          description: data.description ?? undefined,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(),
        }
      })
      onData(lists)
    },
    (err) => {
      recordError(err, 'subscribeToLists')
      onError?.(err)
    },
  )
}

export async function createDefaultList(uid: string): Promise<string> {
  const data = { name: MY_MOVIES_LIST_NAME, createdAt: Timestamp.now() }
  const ref = await addDoc(listsCollection(uid), data)
  return ref.id
}

export async function createList(
  uid: string,
  name: string,
  subtitle?: string,
  description?: string,
): Promise<string> {
  const data: Record<string, unknown> = { name, createdAt: Timestamp.now() }
  if (subtitle) data.subtitle = subtitle
  if (description) data.description = description
  const ref = await addDoc(listsCollection(uid), data)
  return ref.id
}

export async function updateList(
  uid: string,
  listId: string,
  name: string,
  subtitle: string | undefined,
  description: string | undefined,
): Promise<void> {
  await updateDoc(doc(listsCollection(uid), listId), {
    name,
    subtitle: subtitle ?? deleteField(),
    description: description ?? deleteField(),
  })
}

export async function deleteList(uid: string, listId: string): Promise<void> {
  await deleteDoc(doc(listsCollection(uid), listId))
}

export async function deleteAllLists(uid: string): Promise<void> {
  const snapshot = await getDocs(listsCollection(uid))
  if (snapshot.empty) return
  const CHUNK = 500
  for (let i = 0; i < snapshot.docs.length; i += CHUNK) {
    const batch = writeBatch(db)
    snapshot.docs.slice(i, i + CHUNK).forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
}


export function sortLists(lists: MovieList[]): MovieList[] {
  const myMovies = lists.filter((l) => l.name === MY_MOVIES_LIST_NAME)
  const others = lists
    .filter((l) => l.name !== MY_MOVIES_LIST_NAME)
    .sort((a, b) => a.name.localeCompare(b.name))
  return [...myMovies, ...others]
}
