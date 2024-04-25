import type { GQLArticleResolvers } from 'definitions'

import { connectionFromArray, fromConnectionArgs } from 'common/utils'

const resolver: GQLArticleResolvers['appreciationsReceived'] = async (
  { id },
  { input },
  { dataSources: { articleService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  if (take === 0) {
    return connectionFromArray(
      [],
      input,
      await articleService.countAppreciations(id)
    )
  }

  const records = await articleService.findAppreciations({
    referenceId: id,
    take,
    skip,
  })
  const totalCount = records.length === 0 ? 0 : +records[0].totalCount

  return connectionFromArray(records, input, totalCount)
}

export default resolver
