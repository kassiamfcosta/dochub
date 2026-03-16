import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isFavorite, toggleFavorite, getFavorites, sortByFavoritesFirst } from '../favorites'

const userId = 123

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock as any)
  localStorage.clear()
})

describe('favorites persistence', () => {
  it('toggles and persists transcription favorite', () => {
    expect(isFavorite(userId, 'transcription', 1)).toBe(false)
    toggleFavorite(userId, 'transcription', 1)
    expect(isFavorite(userId, 'transcription', 1)).toBe(true)
    const store = getFavorites(userId)
    expect(store.transcription).toContain(1)
  })
})

describe('favorites sorting', () => {
  it('places favorites first, keeping original order among favorites', () => {
    toggleFavorite(userId, 'transcription', 2)
    toggleFavorite(userId, 'transcription', 3)
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]
    const sorted = sortByFavoritesFirst(items, (i) => isFavorite(userId, 'transcription', i.id))
    expect(sorted.map((i) => i.id)).toEqual([2, 3, 1, 4])
  })
})

describe('favorites types independence', () => {
  it('handles HU, summary and cards independently per transcription', () => {
    expect(isFavorite(userId, 'userStory', 5)).toBe(false)
    expect(isFavorite(userId, 'summary', 5)).toBe(false)
    expect(isFavorite(userId, 'cards', 5)).toBe(false)
    toggleFavorite(userId, 'summary', 5)
    toggleFavorite(userId, 'cards', 5)
    expect(isFavorite(userId, 'userStory', 5)).toBe(false)
    expect(isFavorite(userId, 'summary', 5)).toBe(true)
    expect(isFavorite(userId, 'cards', 5)).toBe(true)
  })
})

