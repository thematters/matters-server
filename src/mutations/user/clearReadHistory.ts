import { MutationToClearReadHistoryResolver } from 'definitions'

const resolver: MutationToClearReadHistoryResolver = async (
  _,
  { input: { id: uuid } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const readHistory = await userService.findReadHistoryByUUID(uuid, viewer.id)
  if (!readHistory) {
    throw new Error('readHistory does not exists') // TODO
  }

  await userService.baseUpdateByUUID(uuid, { archived: true }, 'article_read')

  return true
}

export default resolver
