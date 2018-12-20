import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  _,
  { input: { comment, id } },
  { viewer, commentService, articleService, userService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const { content, quote, articleId, parentId, mentions } = comment
  const data: any = {
    content,
    authorId: viewer.id
  }

  const { id: authorDbId } = fromGlobalId(articleId)
  const article = await articleService.idLoader.load(authorDbId)
  if (!article) {
    throw new Error('target article does not exists') // TODO
  }
  data.articleId = article.id

  if (parentId) {
    const { id: parentDbId } = fromGlobalId(parentId)
    const parentComment = await commentService.idLoader.load(parentDbId)
    if (!parentComment) {
      throw new Error('target parentComment does not exists') // TODO
    }
    data.parentCommentId = parentComment.id
  }

  if (mentions) {
    data.mentionedUserIds = mentions.map(
      (userId: string) => fromGlobalId(userId).id
    )
  }

  // Edit
  if (id) {
    const { id: commentDbId } = fromGlobalId(parentId)
    return await commentService.baseUpdateById(commentDbId, data)
  }
  // Create
  else {
    return commentService.create(data)
  }
}

export default resolver
