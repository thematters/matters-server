import type { LANGUAGES } from './language.js'

export interface Translation {
  id: string
  entityTypeId: string
  entityId: string
  entityField: string
  text: string
  language: LANGUAGES
}
