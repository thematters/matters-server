import type { GQLArticleResolvers } from 'definitions'

import { APPRECIATION_PURPOSE } from 'common/enums'

const resolver: GQLArticleResolvers['hasAppreciate'] = async (
  { id },
  _,
  { viewer, dataSources: { atomService } }
) => {
  if (!viewer.id) {
    return false
  }

  const count = await atomService.count({
    table: 'appreciation',
    where: {
      senderId: viewer.id,
      referenceId: id,
      purpose: APPRECIATION_PURPOSE.appreciate,
    },
  })

  return count > 0
}

export default resolver
