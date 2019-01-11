import { CommentToMentionsResolver } from 'definitions'

const resolver: CommentToMentionsResolver = async (
  { id },
  _,
  { dataSources: { userService, commentService } }
) => {
  const mentionedUsers = await commentService.findMentionedUsers(id)
  return userService.dataloader.loadMany(
    mentionedUsers.map(({ userId }: { userId: string }) => userId)
  )
}

export default resolver
