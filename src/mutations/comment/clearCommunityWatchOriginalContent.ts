import type { Context, GQLMutationResolvers } from '#definitions/index.js'

import { ForbiddenError } from '#common/errors.js'

type ClearCommunityWatchOriginalContentInput = {
  uuid: string
  note?: string | null
}

const resolver = async (
  _: unknown,
  {
    input: { uuid, note },
  }: { input: ClearCommunityWatchOriginalContentInput },
  { viewer, dataSources: { commentService } }: Context
) => {
  if (!viewer.hasRole('admin')) {
    throw new ForbiddenError('viewer has no permission')
  }

  return commentService.clearCommunityWatchOriginalContent({
    uuid,
    actorId: viewer.id,
    note,
  })
}

export default resolver as GQLMutationResolvers['clearCommunityWatchOriginalContent']
