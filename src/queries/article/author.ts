import { Resolver } from 'definitions'

const resolver: Resolver = (
  { authorId },
  _,
  { dataSources: { userService } }
) => userService.dataloader.load(authorId)

export default resolver
