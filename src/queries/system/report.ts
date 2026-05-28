import type {
  Context,
  GQLReportResolvers,
  ReportSource,
} from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { ServerError } from '#common/errors.js'
import { toGlobalId } from '#common/utils/index.js'

const report: GQLReportResolvers = {
  id: ({ id, source }) => {
    // For rows derived from `community_watch_action` the union resolver
    // synthesises an id like `cw:42`. Keep the prefix in the inner id so the
    // global id stays distinct from a real report.id and clients can tell
    // them apart if they ever decode it.
    if (source === 'community_watch') {
      const inner = id.startsWith('cw:') ? id : `cw:${id}`
      return toGlobalId({ type: NODE_TYPES.Report, id: inner })
    }
    return toGlobalId({ type: NODE_TYPES.Report, id })
  },
  reporter: ({ reporterId }, _, { dataSources: { atomService } }) =>
    atomService.userIdLoader.load(reporterId),
  target: async (
    { articleId, commentId, momentId },
    _,
    { dataSources: { atomService } }
  ) => {
    if (articleId) {
      return {
        ...(await atomService.articleIdLoader.load(articleId)),
        __type: NODE_TYPES.Article,
      }
    } else if (commentId) {
      return {
        ...(await atomService.commentIdLoader.load(commentId)),
        __type: NODE_TYPES.Comment,
      }
    } else if (momentId) {
      return {
        ...(await atomService.momentIdLoader.load(momentId)),
        __type: NODE_TYPES.Moment,
      }
    } else {
      throw new ServerError('target not found')
    }
  },
  // Defaults to `direct` so rows coming from the legacy `report` table (which
  // never carried this column) are still reported correctly.
  // Parent is typed explicitly here to avoid a chicken-and-egg with codegen:
  // `gen:schema` invokes `tsc` which would otherwise complain about `source`
  // not yet existing on the auto-generated GQLReportResolvers type.
  source: (parent: { source?: ReportSource }) => parent.source ?? 'direct',
  communityWatchAction: (
    parent: { id: string; source?: ReportSource },
    _: unknown,
    { dataSources: { commentService } }: Context
  ) => {
    if (parent.source !== 'community_watch') {
      return null
    }

    const id = parent.id.startsWith('cw:')
      ? parent.id.replace(/^cw:/, '')
      : parent.id
    return commentService.findCommunityWatchActionById(id)
  },
}

export default report
