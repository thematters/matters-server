import { Resolver } from 'definitions'
import { MAT_UNIT } from 'common/enums'

const resolver: Resolver = async (
  { id, mat },
  _,
  { viewer, dataSources: { userService } }
) => {
  const invited = await userService.findInvitations({ userId: id })
  return Math.max(
    Math.floor(mat / MAT_UNIT.invitationCalculate) - invited.length,
    0
  )
}

export default resolver
