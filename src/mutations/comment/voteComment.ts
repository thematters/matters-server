import type { GQLMutationResolvers } from 'definitions'

import { VOTE } from 'common/enums'
import { CommentNotFoundError } from 'common/errors'
import { getLogger } from 'common/logger'
import { fromGlobalId } from 'common/utils'

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
    await commentService.upVote({ comment, user: viewer })
  } else {
    logger.warning(`deprecated down vote is called`)
  }
  return comment
}

export default resolver
