import { LIKEToTotalResolver } from 'definitions'

const resolver: LIKEToTotalResolver = async (
  { id },
  _: any,
  { dataSources: { userService } }
) => {
  return await userService.totalLIKE({ userId: id })
}

export default resolver
