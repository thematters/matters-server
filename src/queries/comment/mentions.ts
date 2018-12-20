import { Resolver } from 'definitions'

const resolver: Resolver = async (
  { id },
  _,
  { userService, commentService }
) => {
  const mentionedUsers = await commentService.findMentionedUsers(id)
  return userService.idLoader.loadMany(mentionedUsers.map(m => m.userId))
}

export default resolver
