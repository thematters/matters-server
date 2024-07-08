import { LANGUAGES } from './language'

export interface Translation {
  id: string
  entityTypeId: string
  entityId: string
  entityField: string
  text: string
  language: LANGUAGES
}
