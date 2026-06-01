import type { GQLMutationResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['setWritingAdStatus'] = async (
  _,
  { input: { id: globalId, isAd } },
  { dataSources: { atomService } }
) => {
  const { type, id } = fromGlobalId(globalId)

  if (!id) {
    throw new UserInputError('id is invalid')
  }

  switch (type) {
    case NODE_TYPES.Article: {
      const article = await atomService.update({
        table: 'article',
        where: { id },
        data: { isAd },
      })

      return { ...article, __type: NODE_TYPES.Article } as any
    }

    case NODE_TYPES.Moment: {
      const moment = await atomService.update({
        table: 'moment',
        where: { id },
        data: { isAd },
      })

      return { ...moment, __type: NODE_TYPES.Moment } as any
    }

    default:
      throw new UserInputError(`Unsupported content type: ${type}`)
  }
}

export default resolver
