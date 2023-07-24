import type { CollectionToAuthorResolver } from 'definitions'

const resolver: CollectionToAuthorResolver = (
  { authorId },
  _,
  { dataSources: { userService } }
) => userService.dataloader.load(authorId)

export default resolver
