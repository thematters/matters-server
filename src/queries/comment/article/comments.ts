import { Resolver, Context, ArticleToCommentsArgs } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = (
  { id }: { id: string },
  { input }: ArticleToCommentsArgs,
  { commentService }: Context
) => {
  const args = { ...input, id }
  if (input.author) {
    const { id: authorId } = fromGlobalId(input.author)
    args.author = authorId
  }

  return commentService.findByArticle(args)
}

export default resolver
