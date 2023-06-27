import { NODE_TYPES } from 'common/enums'
import { toGlobalId } from 'common/utils'

import articles from './articles'
import collections from './collections'
import cover from './cover'

export default {
  User: {
    collections,
  },
  Collection: {
    id: ({ id }: { id: string }) =>
      toGlobalId({ type: NODE_TYPES.Collection, id }),
    cover,
    articles,
  },
}
