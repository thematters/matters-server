import { Resolver } from 'definitions'
import { PUBSUB_EVENT } from 'common/enums'
import pubsub from 'common/pubsub'

const resolver: Resolver = async (
  _,
  { input: { comment, uuid } },
  { viewer, commentService, articleService, userService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const { content, quote, articleUUID, parentUUID, mentions } = comment
  const data: any = {
    content,
    authorId: viewer.id
  }

  const article = await articleService.uuidLoader.load(articleUUID)
  if (!article) {
    throw new Error('target article does not exists') // TODO
  }
  data.articleId = article.id

  if (parentUUID) {
    const parentComment = await commentService.uuidLoader.load(parentUUID)
    if (!parentComment) {
      throw new Error('target parentComment does not exists') // TODO
    }
    data.parentCommentId = parentComment.id
  }

  if (mentions) {
    const users = await userService.uuidLoader.loadMany(mentions)
    data.mentionedUserId = users.map(u => u.id)
  }

  // Edit
  if (uuid) {
    const comment = await commentService.updateByUUID(uuid, data)
    pubsub.publish(PUBSUB_EVENT.commentUpdated, comment)
    return comment
  }
  // Create
  else {
    const comment = await commentService.create(data)
    pubsub.publish(PUBSUB_EVENT.commentCreated, comment)
    return comment
  }
}

export default resolver
