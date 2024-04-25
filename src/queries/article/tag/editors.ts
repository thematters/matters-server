import type { GQLTagResolvers } from 'definitions'

import { environment } from 'common/environment'

const resolver: GQLTagResolvers['editors'] = (
  { editors, owner },
  { input },
  { dataSources: { atomService } }
) => {
  let ids = editors || []

  if (input?.excludeAdmin === true) {
    ids = ids.filter((editor: string) => editor !== environment.mattyId)
  }

  if (input?.excludeOwner === true) {
    ids = ids.filter((editor: string) => editor !== owner)
  }

  return atomService.userIdLoader.loadMany(ids)
}

export default resolver
