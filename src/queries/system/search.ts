import _ from 'lodash'

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
  GQLSearchAPIVersion,
  QueryToSearchResolver,
} from 'definitions'

// the original ElasticSearch based solution
const resolverV0: QueryToSearchResolver = async (
  root,
  { input },
  {
    dataSources: { systemService, articleService, userService, tagService },
    viewer,
  }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const serviceMap = {
    Article: articleService,
    User: userService,
    Tag: tagService,
  }

  const connection = await serviceMap[input.type]
    .search({ ...input, take, skip, viewerId: viewer.id })
    .then(({ nodes, totalCount }) => {
      nodes = _.compact(nodes)
      return {
        nodes: nodes.map((node: GQLNode) => ({ __type: input.type, ...node })),
        totalCount,
      }
    })

  return connectionFromArray(connection.nodes, input, connection.totalCount)
}

const resolverV1: QueryToSearchResolver = async (
  root,
  { input },
  {
    dataSources: { systemService, articleService, userService, tagService },
    viewer,
  }
) => {
  const { take, skip } = fromConnectionArgs(input)

  // TBD: searchV1 for each {user,tag,article}Service

  const serviceMap = {
    Article: articleService,
    User: userService,
    Tag: tagService,
  }

  input.key = await normalizeQueryInput(input.key)

  const connection = await serviceMap[input.type]
    .searchV1({ ...input, take, skip, viewerId: viewer.id })
    .then(({ nodes, totalCount }) => {
      nodes = _.compact(nodes)
      return {
        nodes: nodes.map((node: GQLNode) => ({ __type: input.type, ...node })),
        totalCount,
      }
    })

  return connectionFromArray(connection.nodes, input, connection.totalCount)
  // return connectionFromArray([], input, 0)
}

const resolver: QueryToSearchResolver = async (
  root,
  args, // { input },
  context, // { dataSources: { systemService, articleService, userService, tagService }, viewer, }
  info
) => {
  const { input } = args
  const {
    dataSources: { systemService },
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

  // TODO: after V1 released and verified successful, this new V1 will be switched as default
  if (input.version === GQLSearchAPIVersion.v20221212) {
    return resolverV1(root, args, context, info)
  } else {
    // V0 is default
    return resolverV0(root, args, context, info)
  }
}

export default resolver
