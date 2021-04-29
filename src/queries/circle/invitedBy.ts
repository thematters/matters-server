import { CircleToInvitedByResolver } from 'definitions'

const resolver: CircleToInvitedByResolver = async (
  { id },
  _,
  { knex, viewer }
) => {
  if (!viewer.id) {
    return null
  }

  const invitation = await knex
    .select()
    .from('circle_invitation')
    .where({ circleId: id, accept: false })
    .andWhere(function () {
      this.where('user_id', viewer.id).orWhere('email', viewer.email)
    })
    .orderBy('created_at', 'desc')
    .first()

  return invitation
}

export default resolver
