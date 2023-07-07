import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'

import articles from './articles'
import author from './author'
import contains from './contains'
import cover from './cover'

export default {
  id: ({ id }: { id: string }) =>
    toGlobalId({ type: NODE_TYPES.Collection, id }),
  cover,
  articles,
  author,
  contains,
}
