import type { Extractor } from '../../entities/types'
import { personExtractor } from './person'
import { placeExtractor } from './place'
import { projectExtractor } from './project'
import { ideaExtractor } from './idea'
import { taskExtractor } from './task'
import { dateExtractor } from './date'
import { topicExtractor } from './topic'

export const extractors: Extractor[] = [
  personExtractor,
  placeExtractor,
  projectExtractor,
  ideaExtractor,
  taskExtractor,
  dateExtractor,
  topicExtractor,
]

export type { Extractor } from '../../entities/types'
