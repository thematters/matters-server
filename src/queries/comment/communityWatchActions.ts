import type {
  CommunityWatchAction,
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

const applyFilters = (query: any, input: CommunityWatchActionsInput) => {
  if (input.reason) {
    query.where({ reason: input.reason })
  }
  if (input.actionState) {
    query.where({ actionState: input.actionState })
  }
  if (input.appealState) {
    query.where({ appealState: input.appealState })
  }
  if (input.reviewState) {
    query.where({ reviewState: input.reviewState })
  }
}

const resolver: GQLQueryResolvers['communityWatchActions'] = async (
  _: unknown,
  { input }: { input: CommunityWatchActionsInput },
  { dataSources: { connections: { knex } } }: Context
) => {
  const connectionArgs = {
    after: input.after || undefined,
    first: input.first,
  }
  const { take, skip } = fromConnectionArgs(connectionArgs, {
    maxTake: MAX_PUBLIC_ACTIONS_PER_PAGE,
  })

  const baseQuery = knex('community_watch_action').select()
  applyFilters(baseQuery, input)

  const [actions, countResult] = await Promise.all([
    baseQuery
      .clone()
      .orderBy('createdAt', 'desc')
      .orderBy('id', 'desc')
      .offset(skip)
      .limit(take),
    baseQuery.clone().count('*').first(),
  ])

  const totalCount = Number(countResult?.count || 0)

  return connectionFromArray(
    actions as CommunityWatchAction[],
    connectionArgs,
    totalCount
  )
}

export default resolver
