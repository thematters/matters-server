import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'
import { UserToTagsResolver } from 'definitions'

const resolver: UserToTagsResolver = async (
  { id },
  { input },
  { dataSources: { tagService } }
) => {
  const { take, skip } = fromConnectionArgs(input, { defaultTake: 10 })

  const totalCount = await tagService.findTotalTagsByAuthorUsage(id)
  const items = await tagService.findByAuthorUsage({
    userId: id,
    skip,
    take,
  })

  return connectionFromPromisedArray(
    tagService.dataloader.loadMany(
      items.filter((item: any) => item?.id).map((item: any) => `${item.id}`)
    ),
    input,
    totalCount
  )
}

export default resolver
