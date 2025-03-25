import type { GQLUserStatusResolvers } from '#definitions/index.js'

import { COMMENT_STATE, COMMENT_TYPE } from '#common/enums/index.js'

const resolver: GQLUserStatusResolvers['commentCount'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const totalCount = await atomService.count({
    table: 'comment',
    where: {
      authorId: id,
      state: COMMENT_STATE.active,
      type: COMMENT_TYPE.article,
    },
  })

  return totalCount
}

export default resolver
