import type { CommentFilter } from '#connectors/index.js'
import type { GQLWritingChallengeResolvers } from '#definitions/index.js'

import { COMMENT_TYPE } from '#common/enums/index.js'
import {
  connectionFromArray,
  connectionFromArrayWithKeys,
  cursorToKeys,
  fromGlobalId,
} from '#common/utils/index.js'

// Campaign discussion is public to read: unlike circle discussion, there is no
// membership check here. Write permission is enforced in the putComment mutation.
const resolver: GQLWritingChallengeResolvers['discussion'] = async (
  { id },
  { input: { sort, first, ...rest } },
  { dataSources: { atomService, commentService } }
) => {
  if (!id) {
    return connectionFromArray([], rest)
  }

  // resolve sort to order
  const order = sort === 'oldest' ? 'asc' : 'desc'

  // set default for first in forward pagination. use null for query all.
  // TODO: use "last" for backward pagination
  if (!rest.before && typeof first === 'undefined') {
    first = 10
  }

  // handle pagination
  let before
  let after
  if (rest.after) {
    after = cursorToKeys(rest.after).idCursor?.toString()
  }
  if (rest.before) {
    before = cursorToKeys(rest.before).idCursor?.toString()
  }

  // handle filter
  const { id: targetTypeId } = await atomService.findFirst({
    table: 'entity_type',
    where: { table: 'campaign' },
  })

  const where = {
    type: COMMENT_TYPE.campaignDiscussion,
    targetId: id,
    targetTypeId,
    parentCommentId: null,
  } as CommentFilter

  if (rest.filter) {
    const { parentComment, author, state } = rest.filter
    if (parentComment || parentComment === null) {
      where.parentCommentId = parentComment
        ? fromGlobalId(parentComment).id
        : null
    }
    if (author) {
      where.authorId = fromGlobalId(author).id
    }
    if (state) {
      where.state = state
    }
  }

  const [comments, totalCount] = await commentService.find({
    sort,
    before,
    after,
    first,
    where,
    order,
    includeAfter: rest.includeAfter,
    includeBefore: rest.includeBefore,
  })

  if (!comments.length) {
    return connectionFromArray([], rest)
  }

  return connectionFromArrayWithKeys(comments, rest, totalCount)
}

export default resolver
