import { ArticleToParticipantsResolver } from 'definitions'

const resolver: ArticleToParticipantsResolver = async (
  { id }: { id: string },
  _,
  { dataSources: { articleService, userService } }
) => {
  // TODO: get participantes from comments
  const actions = await articleService.findSubscriptions({ id })
  return userService.dataloader.loadMany(
    actions.map(({ userId }: { userId: string }) => userId)
  )
}

export default resolver
