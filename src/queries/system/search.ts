import type { GQLQueryResolvers, SearchHistory } from '#definitions/index.js'

import {
  SEARCH_ARTICLE_URL_REGEX,
  SEARCH_KEY_TRUNCATE_LENGTH,
} from '#common/enums/index.js'
import {
  connectionFromArray,
  fromConnectionArgs,
  fromGlobalId,
  stripSpaces,
} from '#common/utils/index.js'
import compact from 'lodash/compact.js'

const resolver: GQLQueryResolvers['search'] = async (
  _,
  { input },
  { dataSources: { systemService, searchService }, viewer }
) => {
  if (input.key) {
    const match = SEARCH_ARTICLE_URL_REGEX.exec(input.key)
    input.key = match
      ? match[5]
      : input.key.slice(0, SEARCH_KEY_TRUNCATE_LENGTH)
  }

  if (input.key && input.record) {
    systemService.baseCreate<SearchHistory>(
      { userId: viewer ? viewer.id : null, searchKey: input.key },
      'search_history'
    )
  }

  if (input?.filter?.authorId) {
    const { id: authorId } = fromGlobalId(input.filter.authorId)
    input.filter.authorId = authorId as any
  }

  const { take, skip } = fromConnectionArgs(input)

  const keyOriginal = input.key
  input.key = stripSpaces(keyOriginal) as string

  switch (input.type) {
    case 'Article': {
      const connection = await searchService.searchArticles({
        ...input,
        take,
        skip,
        viewerId: viewer.id,
      })
      return connectionFromArray(
        compact(connection.nodes),
        input,
        connection.totalCount
      )
    }
    case 'User': {
      const connection = await searchService.searchUsers({
        ...input,
        take,
        skip,
        viewerId: viewer.id,
      })
      return connectionFromArray(
        compact(connection.nodes),
        input,
        connection.totalCount
      )
    }
    case 'Tag': {
      const connection = await searchService.searchTags({
        ...input,
        take,
        skip,
      })
      return connectionFromArray(
        compact(connection.nodes),
        input,
        connection.totalCount
      )
    }
  }
}

export default resolver
