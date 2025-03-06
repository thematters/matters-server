import type { GQLOssResolvers } from 'definitions/index.js'

import {
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils/index.js'

export const icymiTopics: GQLOssResolvers['icymiTopics'] = async (
  _,
  { input },
  { dataSources: { atomService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const totalCount = await atomService.count({ table: 'matters_choice_topic' })

  return connectionFromPromisedArray(
    atomService.findMany({
      table: 'matters_choice_topic',
      skip,
      take,
      orderBy: [{ column: 'id', order: 'desc' }],
    }),
    input,
    totalCount
  )
}
