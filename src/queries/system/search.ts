import _ from 'lodash'

import { SEARCH_KEY_TRUNCATE_LENGTH } from 'common/enums'
import { connectionFromArray, cursorToIndex } from 'common/utils'
import { GQLNode, QueryToSearchResolver } from 'definitions'

const resolver: QueryToSearchResolver = async (
  root,
  { input },
  {
    dataSources: { systemService, articleService, userService, tagService },
    viewer
  }
) => {
  if (input.key) {
    input.key = input.key.slice(0, SEARCH_KEY_TRUNCATE_LENGTH)
  }

  if (input.type !== 'User' && input.key) {
    systemService.baseCreate(
      { userId: viewer ? viewer.id : null, searchKey: input.key },
      'search_history'
    )
  }

  const offset = cursorToIndex(input.after) + 1

  const serviceMap = {
    Article: articleService,
    User: userService,
    Tag: tagService
  }

  const connection = await serviceMap[input.type]
    .search({ ...input, offset })
    .then(({ nodes, totalCount }) => {
      nodes = _.compact(nodes)
      return {
        nodes: nodes.map((node: GQLNode) => ({ ...node, __type: input.type })),
        totalCount
      }
    })

  return connectionFromArray(connection.nodes, input, connection.totalCount)
}

export default resolver
