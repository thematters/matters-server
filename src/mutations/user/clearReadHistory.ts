import { Resolver } from 'definitions'

const resolver: Resolver = async (
  _,
  { input: { id } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const readHistory = await userService.findReadHistoryById(id, viewer.id)
  if (!readHistory) {
    throw new Error('readHistory does not exists') // TODO
  }

  await userService.baseUpdateById(id, { archived: true }, 'article_read')

  return true
}

export default resolver
