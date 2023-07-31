import type { GQLUserResolvers } from 'definitions'

import { connectionFromPromisedArray } from 'common/utils'

const resolver: GQLUserResolvers['drafts'] = (
  { id },
  { input },
  { dataSources: { draftService } }
) =>
  connectionFromPromisedArray(draftService.findUnpublishedByAuthor(id), input)

export default resolver
