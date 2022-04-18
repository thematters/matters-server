import _ from 'lodash'

import {
  SEARCH_ARTICLE_URL_REGEX,
  SEARCH_KEY_TRUNCATE_LENGTH,
} from 'common/enums'
import {
  connectionFromArray,
  fromConnectionArgs,
  fromGlobalId,
} from 'common/utils'
import { GQLNode, QueryToSearchResolver } from 'definitions'

const resolver: QueryToSearchResolver = async (
  root,
  { input },
  {
    dataSources: { systemService, articleService, userService, tagService },
    viewer,
  }
) => {
  const { take, skip } = fromConnectionArgs(input)

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

  const serviceMap = {
    Article: articleService,
    User: userService,
    Tag: tagService,
  }

  const connection = await serviceMap[input.type]
    .search({ ...input, skip, take, viewerId: viewer.id })
    .then(({ nodes, totalCount }) => {
      nodes = _.compact(nodes)
      return {
        nodes: nodes.map((node: GQLNode) => ({ __type: input.type, ...node })),
        totalCount,
      }
    })

  return connectionFromArray(connection.nodes, input, connection.totalCount)
}

export default resolver
