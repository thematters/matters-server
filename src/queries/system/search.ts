import type { GQLQueryResolvers, SearchHistory } from '#definitions/index.js'

import {
  SEARCH_ARTICLE_URL_REGEX,
  SEARCH_KEY_TRUNCATE_LENGTH,
  SEARCH_API_VERSION,
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
  {
    dataSources: { systemService, articleService, userService, tagService },
    viewer,
  }
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
    input.filter.authorId = authorId
  }

  const { take, skip } = fromConnectionArgs(input)

  const serviceMap = {
    Article: articleService,
    User: userService,
    Tag: tagService,
  }

  const keyOriginal = input.key
  input.key = stripSpaces(keyOriginal) as string

  // TODO: remove unused search methods to fix any type error
  const connection = await (input.version === SEARCH_API_VERSION.v20230601
    ? serviceMap[input.type].searchV3
    : serviceMap[input.type].search)({
    ...input,
    take,
    skip,
    viewerId: viewer.id,
  }).then(({ nodes, totalCount }) => {
    nodes = compact(nodes)
    return {
      nodes: nodes.map((node) => ({ __type: input.type, ...node })),
      totalCount,
    }
  })

  return connectionFromArray(
    connection.nodes as any[],
    input,
    connection.totalCount
  )
}

export default resolver
