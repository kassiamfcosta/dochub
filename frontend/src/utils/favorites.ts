type FavoriteItemType = 'transcription' | 'userStory' | 'summary' | 'cards' | 'report'

interface FavoritesStore {
  transcription: number[]
  userStory: number[]
  summary: number[]
  cards: number[]
  report: number[]
}

const FAVORITES_PREFIX = 'doc-hub:favorites:'

function getKey(userId: number) {
  return `${FAVORITES_PREFIX}${userId}`
}

function read(userId: number): FavoritesStore {
  const raw = globalThis.localStorage?.getItem(getKey(userId))
  if (!raw) {
    return { transcription: [], userStory: [], summary: [], cards: [], report: [] }
  }
  try {
    const parsed = JSON.parse(raw)
    return {
      transcription: Array.isArray(parsed.transcription) ? parsed.transcription : [],
      userStory: Array.isArray(parsed.userStory) ? parsed.userStory : [],
      summary: Array.isArray(parsed.summary) ? parsed.summary : [],
      cards: Array.isArray(parsed.cards) ? parsed.cards : [],
      report: Array.isArray(parsed.report) ? parsed.report : [],
    }
  } catch {
    return { transcription: [], userStory: [], summary: [], cards: [], report: [] }
  }
}

function write(userId: number, store: FavoritesStore) {
  globalThis.localStorage?.setItem(getKey(userId), JSON.stringify(store))
}

export function isFavorite(userId: number, type: FavoriteItemType, id: number) {
  const store = read(userId)
  const list = store[type]
  return list.includes(id)
}

export function toggleFavorite(userId: number, type: FavoriteItemType, id: number) {
  const store = read(userId)
  const list = store[type]
  if (list.includes(id)) {
    store[type] = list.filter((x) => x !== id)
  } else {
    store[type] = [...list, id]
  }
  write(userId, store)
  return store
}

export function getFavorites(userId: number): FavoritesStore {
  return read(userId)
}

export function sortByFavoritesFirst<T>(items: T[], isFav: (item: T) => boolean) {
  const fav: T[] = []
  const nonFav: T[] = []
  for (const item of items) {
    if (isFav(item)) fav.push(item)
    else nonFav.push(item)
  }
  return [...fav, ...nonFav]
}

