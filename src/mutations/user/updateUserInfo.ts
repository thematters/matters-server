import { has, isEmpty } from 'lodash'

import {
  AssetNotFoundError,
  AuthenticationError,
  DisplayNameInvalidError,
  ForbiddenError,
  UserInputError,
  UsernameExistsError,
  UsernameInvalidError
} from 'common/errors'
import { isValidDisplayName, isValidUserName } from 'common/utils'
import { MutationToUpdateUserInfoResolver } from 'definitions'

const resolver: MutationToUpdateUserInfoResolver = async (
  _,
  { input },
  { viewer, dataSources: { userService, systemService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const updateParams: { [key: string]: any } = {
    ...(has(input, 'description') ? { description: input.description } : {}),
    ...(has(input, 'language') ? { language: input.language } : {})
  }

  // check avatar
  if (input.avatar) {
    const avatarAssetUUID = input.avatar
    const asset = await systemService.findAssetByUUID(avatarAssetUUID)
    if (!asset || asset.type !== 'avatar' || asset.authorId !== viewer.id) {
      throw new AssetNotFoundError('avatar asset does not exists')
    }
    updateParams.avatar = asset.id
  }

  // check profile cover
  if (input.profileCover) {
    const asset = await systemService.findAssetByUUID(input.profileCover)
    if (
      !asset ||
      asset.type !== 'profileCover' ||
      asset.authorId !== viewer.id
    ) {
      throw new AssetNotFoundError('profile cover asset does not exists')
    }
    updateParams.profileCover = asset.id
  } else if (input.profileCover === null) {
    updateParams.profileCover = null
  }

  // check user name is editable
  if (input.userName) {
    const isUserNameEditable = await userService.isUserNameEditable(viewer.id)
    if (!isUserNameEditable) {
      throw new ForbiddenError('userName is not allow to edit')
    }
    if (!isValidUserName(input.userName)) {
      throw new UsernameInvalidError('invalid user name')
    }
    const isUserNameExisted = await userService.countUserNames(input.userName)
    if (isUserNameExisted > 0) {
      throw new UsernameExistsError('user name already exists')
    }
    updateParams.userName = input.userName
  }

  // check user display name
  if (input.displayName) {
    if (!isValidDisplayName(input.displayName) && !viewer.hasRole('admin')) {
      throw new DisplayNameInvalidError('invalid user display name')
    }
    updateParams.displayName = input.displayName
  }

  // check user agree term
  if (input.agreeOn === true) {
    updateParams.agreeOn = new Date()
  }

  if (isEmpty(updateParams)) {
    throw new UserInputError('bad request')
  }

  // update user info
  const user = await userService.updateInfo(viewer.id, updateParams)

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
