'use client'

import { useCallback } from 'react'

import { ReactStateDispatch, SetStateAction } from '$ui/lib/commonTypes'
import { create, StateCreator } from 'zustand'
import { persist, PersistOptions } from 'zustand/middleware'

export enum AppLocalStorage {
  editorLineNumbers = 'editorLineNumbers',
  editorWrapText = 'editorWrapText',
  editorMinimap = 'editorMinimap',
}

const isLocalStorageAvailable = (() => {
  try {
    const testKey = '__test__'
    localStorage.setItem(testKey, testKey)
    localStorage.removeItem(testKey)
    return true
  } catch (e) {
    return false
  }
})()

export function buildKey(key: AppLocalStorage): string {
  return `latitude:${key}`
}

export function getStorageValue(key: string, defaultValue: unknown) {
  if (!isLocalStorageAvailable) return defaultValue

  const saved = localStorage.getItem(key)
  if (saved == 'undefined') return undefined
  return saved ? JSON.parse(saved) : defaultValue
}

type LocalStorageStore = {
  values: Partial<Record<string, unknown>>
  setValue: (key: string, value: unknown) => void
}

type LocalStorageStorePersist = (
  config: StateCreator<LocalStorageStore>,
  options: PersistOptions<LocalStorageStore>,
) => StateCreator<LocalStorageStore>

const useLocalStorageStore = create<LocalStorageStore>(
  (persist as LocalStorageStorePersist)(
    (set) => ({
      values: {},
      setValue: (key, value) => {
        if (typeof value === 'function') {
          value = value(getStorageValue(key, null))
        }

        if (isLocalStorageAvailable) {
          localStorage.setItem(key, JSON.stringify(value))
        }

        set((state) => ({
          values: {
            ...state.values,
            [key]: value,
          },
        }))
      },
    }),
    {
      name: 'local-storage-store', // name of the item in the storage
      getStorage: () => localStorage, // (optional) by default, 'localStorage' is used
    },
  ),
)

type Props<T> = {
  key: AppLocalStorage
  defaultValue: T
}
type ReturnType<T> = {
  value: T
  setValue: ReactStateDispatch<T>
}
export const useLocalStorage = <T>({
  key,
  defaultValue,
}: Props<T>): ReturnType<T> => {
  const fullKey = buildKey(key)
  const { value, setValue } = useLocalStorageStore((state) => {
    if (!(fullKey in state.values)) {
      // Initialize
      state.values[fullKey] = getStorageValue(fullKey, defaultValue)
    }
    return {
      value: state.values[fullKey] as T,
      setValue: state.setValue,
    }
  })

  return {
    value,
    setValue: useCallback(
      (newValue: SetStateAction<T>) => {
        setValue(fullKey, newValue)
      },
      [setValue, fullKey],
    ),
  }
}