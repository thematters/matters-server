import type { GQLMutationResolvers } from '#definitions/index.js'

import { VOTE } from '#common/enums/index.js'
import { CommentNotFoundError } from '#common/errors.js'
import { getLogger } from '#common/logger.js'
import { fromGlobalId } from '#common/utils/index.js'

const logger = getLogger('resolvers-voteComment')

const resolver: GQLMutationResolvers['voteComment'] = async (
  _,
  { input: { id, vote } },
  { viewer, dataSources: { atomService, commentService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const comment = await atomService.commentIdLoader.load(dbId)
  if (!comment) {
    throw new CommentNotFoundError('comment not found')
  }
  if (vote === VOTE.up) {
    await commentService.upvote({ comment, user: viewer })
  } else {
    logger.warning(`deprecated down vote is called`)
  }
  return comment
}

export default resolver
