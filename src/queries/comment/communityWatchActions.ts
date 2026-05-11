import type {
  Context,
  GQLQueryResolvers,
} from '#definitions/index.js'

import { connectionFromArray, fromConnectionArgs } from '#common/utils/index.js'

const MAX_PUBLIC_ACTIONS_PER_PAGE = 50

type CommunityWatchActionsInput = {
  after?: string
  first?: number | null
  reason?: string | null
  actionState?: string | null
  appealState?: string | null
  reviewState?: string | null
}

const resolver: GQLQueryResolvers['communityWatchActions'] = async (
  _: unknown,
  { input }: { input: CommunityWatchActionsInput },
  { dataSources: { commentService } }: Context
) => {
  const connectionArgs = {
    after: input.after || undefined,
    first: input.first,
  }
  const { take, skip } = fromConnectionArgs(connectionArgs, {
    maxTake: MAX_PUBLIC_ACTIONS_PER_PAGE,
  })

  const [actions, totalCount] = await commentService.findCommunityWatchActions({
    filter: input,
    skip,
    take,
  })

  return connectionFromArray(
    actions,
    connectionArgs,
    totalCount
  )
}

export default resolver
