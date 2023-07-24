import type { ArticleToAuthorResolver } from 'definitions'

const resolver: ArticleToAuthorResolver = (
  { authorId },
  _,
  { dataSources: { userService } }
) => userService.dataloader.load(authorId)

export default resolver
