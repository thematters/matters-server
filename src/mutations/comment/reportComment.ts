import {
  AssetNotFoundError,
  CommentNotFoundError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToReportCommentResolver } from 'definitions'

const resolver: MutationToReportCommentResolver = async (
  root,
  { input: { id, category, description, contact, assetIds: assetUUIDs } },
  {
    viewer,
    dataSources: {
      userService,
      commentService,
      systemService,
      notificationService,
    },
  }
) => {
  if (!viewer.id && !contact) {
    throw new UserInputError('"contact" is required with visitor')
  }

  const { id: dbId } = fromGlobalId(id)
  const comment = await commentService.dataloader.load(dbId)
  if (!comment) {
    throw new CommentNotFoundError('target comment does not exists')
  }

  let assetIds
  if (assetUUIDs) {
    const assets = await systemService.findAssetByUUIDs(assetUUIDs)
    if (!assets || assets.length <= 0) {
      assetIds = []
      // throw new AssetNotFoundError('Asset does not exists')
    }
    assetIds = assets.map((asset: any) => asset.id)
  }

  await commentService.report({
    commentId: comment.id,
    userId: viewer.id,
    category,
    description,
    contact,
    assetIds,
  })

  // trigger notification
  const commentAuthor = await userService.dataloader.load(comment.authorId)
  notificationService.trigger({
    event: 'comment_reported',
    entities: [{ type: 'target', entityTable: 'comment', entity: comment }],
    recipientId: commentAuthor.id,
  })

  return true
}

export default resolver
