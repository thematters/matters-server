import { TopicToAuthorResolver } from 'definitions'

const resolver: TopicToAuthorResolver = (
  { userId },
  _,
  { dataSources: { userService } }
) => userService.dataloader.load(userId)

export default resolver
