import type { GQLTagResolvers } from 'definitions'

import { environment } from 'common/environment'

const resolver: GQLTagResolvers['isOfficial'] = async ({ id }) => {
  const { mattyChoiceTagId } = environment
  return id === mattyChoiceTagId
}

export default resolver
