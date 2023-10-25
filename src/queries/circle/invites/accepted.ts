import type { GQLInvitesResolvers } from 'definitions'

import { INVITATION_STATE } from 'common/enums'
import { connectionFromArray, fromConnectionArgs } from 'common/utils'

const resolver: GQLInvitesResolvers['accepted'] = async (
  { id, owner },
  { input },
  {
    dataSources: {
      atomService,
      connections: { knex },
    },
    viewer,
  }
) => {
  const isOwner = owner === viewer.id
  if (!isOwner) {
    return connectionFromArray([], input)
  }

  const { take, skip } = fromConnectionArgs(input)

  // here consider accepted, transfer failed and succeeded as true accepted
  const states = Object.values(INVITATION_STATE).filter(
    (state) => state !== INVITATION_STATE.pending
  )

  const table = 'circle_invitation'
  const base = knex
    .max('id as id')
    .max('accepted_at as accepted_at')
    .select('user_id')
    .from(table)
    .where({ circleId: id, inviter: owner })
    .whereIn('state', states)
    .groupBy('user_id')
    .orderBy('accepted_at', 'desc')

  const countQuery = knex.count().from(base.as('base')).first()
  const invitesQuery = base.clone().offset(skip).limit(take)

  const [count, invites] = await Promise.all([countQuery, invitesQuery])
  const totalCount = parseInt(count ? (count.count as string) : '0', 10)
  const records = await Promise.all(
    invites.map(({ id: inviteId }) =>
      atomService.findUnique({ table, where: { id: inviteId } })
    )
  )

  return connectionFromArray(records, input, totalCount)
}

export default resolver
