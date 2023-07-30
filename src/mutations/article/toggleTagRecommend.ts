import type { GQLMutationResolvers } from 'definitions'

import { TagNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['toggleTagRecommend'] = async (
  _,
  { input: { id, enabled } },
  { dataSources: { tagService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const tag = await tagService.dataloader.load(dbId)
  if (!tag) {
    throw new TagNotFoundError('target tag does not exists')
  }

  await (enabled
    ? tagService.addTagRecommendation
    : tagService.removeTagRecommendation)(dbId)

  return tag
}

export default resolver
