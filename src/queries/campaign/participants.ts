import type { GQLWritingChallengeResolvers } from 'definitions'

import { ForbiddenError } from 'common/errors'
import { connectionFromArray, fromConnectionArgs } from 'common/utils'

const resolver: GQLWritingChallengeResolvers['participants'] = async (
  { id },
  { input },
  { viewer, dataSources: { campaignService } }
) => {
  const { oss } = input
  const { take, skip } = fromConnectionArgs(input, { allowTakeAll: true })
  if (oss) {
    if (!viewer.hasRole('admin')) {
      throw new ForbiddenError('only admin can access oss')
    }
    const [participants, totalCount] =
      await campaignService.findAndCountParticipants(
        id,
        { take, skip },
        { filterStates: undefined }
      )
    const connection = connectionFromArray(participants, input, totalCount)
    return {
      ...connection,
      edges: await Promise.all(
        connection.edges.map(async (edge) => {
          const application = await campaignService.getApplication(
            id,
            edge.node.id
          )

          return {
            cursor: edge.cursor,
            node: edge.node,
            applicationState: application.state,
            application: {
              state: application.state,
              createdAt: application.createdAt,
            },
          }
        })
      ),
    }
  } else {
    const [participants, totalCount] =
      await campaignService.findAndCountParticipants(id, { take, skip })
    return connectionFromArray(participants, input, totalCount)
  }
}

export default resolver
