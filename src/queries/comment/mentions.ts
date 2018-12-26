import { Resolver } from 'definitions'

const resolver: Resolver = async (
  { id },
  _,
  { dataSources: { userService, commentService } }
) => {
  const mentionedUsers = await commentService.findMentionedUsers(id)
  return userService.dataloader.loadMany(mentionedUsers.map(m => m.userId))
}

export default resolver
