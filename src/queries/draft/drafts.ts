import type { GQLUserResolvers } from 'definitions/index.js'

import { connectionFromPromisedArray } from 'common/utils/index.js'

const resolver: GQLUserResolvers['drafts'] = (
  { id },
  { input },
  { dataSources: { draftService } }
) =>
  connectionFromPromisedArray(draftService.findUnpublishedByAuthor(id), input)

export default resolver
