import { OSSToNoLikerIdCountResolver } from 'definitions'

export const noLikerIdCount: OSSToNoLikerIdCountResolver = async (
  root,
  _,
  { viewer, dataSources: { userService } }
) => {
  return userService.countNoLikerId()
}
