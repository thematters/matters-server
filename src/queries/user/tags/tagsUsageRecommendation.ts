import type { GQLUserResolvers } from 'definitions'

import {
  connectionFromPromisedArray,
  fromConnectionArgs,
  connectionFromArray,
} from 'common/utils'

const resolver: GQLUserResolvers['tags'] = async (
  { id },
  { input },
  { dataSources: { tagService } }
) => {
  if (id === null) {
    return connectionFromArray([], input)
  }
  const { take, skip } = fromConnectionArgs(input, { defaultTake: 10 })

  const totalCount = await tagService.findTotalTagsByAuthorUsage(id)
  const items = await tagService.findByAuthorUsage({
    userId: id,
    skip,
    take,
  })

  return connectionFromPromisedArray(
    tagService.loadByIds(
      items.filter((item: any) => item?.id).map((item: any) => `${item.id}`)
    ),
    input,
    totalCount
  )
}

export default resolver
