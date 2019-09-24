import { OSSToNoPendingLIKECountResolver } from 'definitions'

export const noPendingLIKECount: OSSToNoPendingLIKECountResolver = async (
  root,
  _,
  { viewer, dataSources: { userService } }
) => {
  return userService.countNoPendingLIKE()
}
