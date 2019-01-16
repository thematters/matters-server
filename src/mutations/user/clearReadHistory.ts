import { AuthenticationError, UserInputError } from 'apollo-server'
import { MutationToClearReadHistoryResolver } from 'definitions'

const resolver: MutationToClearReadHistoryResolver = async (
  _,
  { input: { id: uuid } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const readHistory = await userService.findReadHistoryByUUID(uuid, viewer.id)
  if (!readHistory) {
    throw new UserInputError('readHistory does not exists')
  }

  await userService.baseUpdateByUUID(uuid, { archived: true }, 'article_read')

  return true
}

export default resolver
