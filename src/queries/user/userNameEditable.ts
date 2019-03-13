import { UserInfoToUserNameEditableResolver } from 'definitions'

const resolver: UserInfoToUserNameEditableResolver = (
  { id },
  _,
  { dataSources: { userService } }
) => {
  if (!id) {
    return false
  }

  return userService.isUserNameEditable(id)
}

export default resolver
