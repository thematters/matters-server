import type { GQLUserInfoResolvers } from 'definitions'

const resolver: GQLUserInfoResolvers['featuredTags'] = async (
  { id },
  _,
  { dataSources: { atomService, tagService } }
) => {
  if (id === undefined) {
    return null
  }

  const userTags = await atomService.findFirst({
    table: 'user_tags_order',
    where: { userId: id },
  })

  return tagService.dataloader.loadMany(userTags?.tagIds)
}

export default resolver
