import { invoke } from '@tauri-apps/api/core'
import type { SearchResults } from '../types'

export async function searchAll(query: string): Promise<SearchResults> {
  return invoke<SearchResults>('search_all', { query })
}
