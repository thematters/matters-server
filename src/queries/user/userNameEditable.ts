import { UserInfoToUserNameEditableResolver } from 'definitions'

const resolver: UserInfoToUserNameEditableResolver = (
  { id },
  _,
  { dataSources: { userService } }
) => userService.isUserNameEditable(id)

export default resolver
