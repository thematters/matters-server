import type { GQLUserStatusResolvers } from 'definitions/index.js'

import { ARTICLE_STATE } from 'common/enums/index.js'

const resolver: GQLUserStatusResolvers['articleCount'] = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const count = await atomService.count({
    table: 'article',
    where: { authorId: id, state: ARTICLE_STATE.active },
  })
  return count
}

export default resolver
