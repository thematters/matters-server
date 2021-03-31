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
    .where({ circleId: id })
    .andWhere(function () {
      this.where('user_id', viewer.id).orWhere('email', viewer.email)
    })
    .first()

  return invitation
}

export default resolver
