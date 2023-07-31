import { compact } from 'lodash'

import {
  SEARCH_ARTICLE_URL_REGEX,
  SEARCH_KEY_TRUNCATE_LENGTH,
} from 'common/enums'
import {
  connectionFromArray,
  fromConnectionArgs,
  fromGlobalId,
  normalizeQueryInput,
} from 'common/utils'
import {
  GQLNode,
  GQLSearchApiVersion,
  type GQLQueryResolvers,
} from 'definitions'

const resolver: GQLQueryResolvers['search'] = async (
  _,
  args, // { input },
  context // { dataSources: { systemService, articleService, userService, tagService }, viewer, }
) => {
  const { input } = args
  const {
    // dataSources: { systemService },
    dataSources: { systemService, articleService, userService, tagService },
    viewer,
  } = context

  if (input.key) {
    const match = SEARCH_ARTICLE_URL_REGEX.exec(input.key)
    input.key = match
      ? match[5]
      : input.key.slice(0, SEARCH_KEY_TRUNCATE_LENGTH)
  }

  if (input.key && input.record) {
    systemService.baseCreate(
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
  input.key = await normalizeQueryInput(keyOriginal)

  const connection = await (input.version === GQLSearchApiVersion.v20230601
    ? serviceMap[input.type].searchV3
    : serviceMap[input.type].search)({
    ...input,
    keyOriginal,
    take,
    skip,
    viewerId: viewer.id,
  }).then(({ nodes, totalCount }) => {
    nodes = compact(nodes)
    return {
      nodes: nodes.map((node: GQLNode) => ({ __type: input.type, ...node })),
      totalCount,
    }
  })

  return connectionFromArray(connection.nodes, input, connection.totalCount)
}

export default resolver
