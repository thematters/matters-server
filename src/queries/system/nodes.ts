import type { GQLQueryResolvers } from 'definitions'

import { GRAPHQL_INPUT_LENGTH_LIMIT } from 'common/enums'
import { ActionLimitExceededError } from 'common/errors'

import { getNode } from './utils'

const resolver: GQLQueryResolvers['nodes'] = async (
  _,
  { input: { ids } },
  context
) => {
  if (ids.length >= GRAPHQL_INPUT_LENGTH_LIMIT) {
    throw new ActionLimitExceededError(
      `query exceeds maximum input limit ${GRAPHQL_INPUT_LENGTH_LIMIT}, current: ${ids.length}`
    )
  }
  return Promise.all(ids.map((id) => getNode(id, context)))
}

export default resolver
