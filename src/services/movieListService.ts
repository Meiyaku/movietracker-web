import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  Timestamp,
  QuerySnapshot,
} from 'firebase/firestore'
import { db } from '../firebase'
import { MovieList, MY_MOVIES_LIST_NAME } from '../types'

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
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt : Timestamp.now(),
        }
      })
      onData(lists)
    },
    (err) => {
      console.error('List snapshot error:', err)
      onError?.(err)
    },
  )
}

export async function createDefaultList(uid: string): Promise<string> {
  const data = { name: MY_MOVIES_LIST_NAME, createdAt: Timestamp.now() }
  const ref = await addDoc(listsCollection(uid), data)
  return ref.id
}

export async function createList(uid: string, name: string): Promise<string> {
  const data = { name, createdAt: Timestamp.now() }
  const ref = await addDoc(listsCollection(uid), data)
  return ref.id
}

export async function renameList(uid: string, listId: string, newName: string): Promise<void> {
  await updateDoc(doc(listsCollection(uid), listId), { name: newName })
}

export async function deleteList(uid: string, listId: string): Promise<void> {
  await deleteDoc(doc(listsCollection(uid), listId))
}


export function sortLists(lists: MovieList[]): MovieList[] {
  const myMovies = lists.filter((l) => l.name === MY_MOVIES_LIST_NAME)
  const others = lists
    .filter((l) => l.name !== MY_MOVIES_LIST_NAME)
    .sort((a, b) => a.name.localeCompare(b.name))
  return [...myMovies, ...others]
}
