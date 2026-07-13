import { invoke } from '@tauri-apps/api/core'
import type { MemoryInsights } from '../types'

export async function getMemoryInsights(): Promise<MemoryInsights> {
  return invoke<MemoryInsights>('get_memory_insights')
}
