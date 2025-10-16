import type { GQLMutationResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { AuthenticationError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'

const resolver: GQLMutationResolvers['putMoment'] = async (
  _,
  { input: { content, assets, tags, articles } },
  {
    viewer,
    dataSources: {
      momentService,
      tagService,
      atomService,
      connections: { redis },
    },
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }
  if (tags && tags.length > 0) {
    await Promise.all(
      tags.map(async (tagContent) => {
        await tagService.validate(tagContent, {
          viewerId: viewer.id,
        })
      })
    )
  }

  const assetIds = (
    await atomService.assetUUIDLoader.loadMany(assets || [])
  ).map(({ id }) => id)

  const articleIds = articles
    ? articles.map((gid) => fromGlobalId(gid).id)
    : undefined

  const tagIds = await Promise.all(
    (tags ?? []).map(async (tagContent) => {
      const tag = await tagService.upsert({
        content: tagContent,
        creator: viewer.id,
      })
      return tag.id
    })
  )

  // can not update Moment by now.
  const moment = await momentService.create(
    { content, assetIds, tagIds, articleIds },
    viewer
  )

  invalidateFQC({
    node: { id: viewer.id, type: NODE_TYPES.User },
    redis: redis,
  })
  momentService.detectSpam(moment)

  return moment
}

export default resolver
