import { Resolver } from 'definitions'
import pubsub from 'common/pubsub'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  _,
  { input: { comment, id } },
  { viewer, commentService, articleService, userService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const { content, quotation, articleId, parentId, mentions } = comment
  const data: any = {
    content,
    authorId: viewer.id
  }

  const { id: authorDbId } = fromGlobalId(articleId)
  const article = await articleService.dataloader.load(authorDbId)
  if (!article) {
    throw new Error('target article does not exists') // TODO
  }
  data.articleId = article.id

  if (parentId) {
    const { id: parentDbId } = fromGlobalId(parentId)
    const parentComment = await commentService.dataloader.load(parentDbId)
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

  // Update
  if (id) {
    const { id: commentDbId } = fromGlobalId(id)
    const comment = await commentService.update({ id: commentDbId, ...data })
    pubsub.publish(articleId, article)
    return comment
  }
  // Create
  else {
    const comment = await commentService.create(data)
    pubsub.publish(articleId, article)
    return comment
  }
}

export default resolver
