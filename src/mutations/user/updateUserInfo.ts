import {
  AuthenticationError,
  UserInputError,
  ForbiddenError
} from 'apollo-server'
import { MutationToUpdateUserInfoResolver } from 'definitions'

const resolver: MutationToUpdateUserInfoResolver = async (
  _,
  { input },
  { viewer, dataSources: { userService, systemService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (input.avatar) {
    const avatarAssetUUID = input.avatar
    const asset = await systemService.findAssetByUUID(avatarAssetUUID)

    if (!asset || asset.type !== 'avatar' || asset.authorId !== viewer.id) {
      throw new UserInputError('avatar asset does not exists')
    }

    input.avatar = asset.id
  }

  // check user name is editable
  if (input.userName) {
    const isUserNameEditable = await userService.isUserNameEditable(viewer.id)
    if (!isUserNameEditable) {
      throw new ForbiddenError('userName is not allow to edit')
    }
  }

  // update user info
  const user = await userService.updateInfo(viewer.id, input)

  // add user name edit history
  if (input.userName) {
    await userService.addUserNameEditHistory({
      userId: viewer.id,
      previous: viewer.userName
    })
  }

  return user
}

export default resolver
