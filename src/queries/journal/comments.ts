import type { CommentFilter } from 'connectors'
import type { GQLJournalResolvers } from 'definitions'

import { COMMENT_TYPE } from 'common/enums'
import {
  connectionFromArray,
  connectionFromArrayWithKeys,
  cursorToKeys,
  fromGlobalId,
} from 'common/utils'

const resolver: GQLJournalResolvers['comments'] = async (
  { id },
  { input: { sort, first, ...rest } },
  { dataSources: { atomService, commentService } }
) => {
  // resolve sort to order
  const order = sort === 'oldest' ? 'asc' : 'desc'

  // set default for first in forward pagination. use null for query all.
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
    where: { table: 'journal' },
  })

  const where: CommentFilter = {
    type: COMMENT_TYPE.journal,
    targetId: id,
    targetTypeId,
  }
  if (rest.filter) {
    const { author, state } = rest.filter
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
