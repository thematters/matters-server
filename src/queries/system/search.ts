import _ from 'lodash'

import { connectionFromArray, cursorToIndex } from 'common/utils'
import { QueryToSearchResolver, GQLNode } from 'definitions'

const resolver: QueryToSearchResolver = async (
  root,
  { input },
  {
    dataSources: { systemService, articleService, userService, tagService },
    viewer
  }
) => {
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

  const { nodes, totalCount } = await serviceMap[input.type]
    .search({ ...input, offset })
    .then(({ nodes, totalCount }) => {
      nodes = _.compact(nodes)
      return {
        nodes: nodes.map((node: GQLNode) => ({ ...node, __type: input.type })),
        totalCount
      }
    })

  return connectionFromArray(nodes, input, totalCount)
}

export default resolver
