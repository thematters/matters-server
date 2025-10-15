import type { GQLMutationResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['setSpamStatus'] = async (
  _,
  { input: { id: globalId, isSpam } },
  { dataSources: { atomService, publicationService } }
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
        data: { isSpam },
      })

      if (!isSpam) {
        await publicationService.runPostProcessing(article, false)
      }

      return { ...article, __type: NODE_TYPES.Article } as any
    }

    case NODE_TYPES.Comment: {
      const comment = await atomService.update({
        table: 'comment',
        where: { id },
        data: { isSpam },
      })

      return { ...comment, __type: NODE_TYPES.Comment } as any
    }

    case NODE_TYPES.Moment: {
      const moment = await atomService.update({
        table: 'moment',
        where: { id },
        data: { isSpam },
      })

      return { ...moment, __type: NODE_TYPES.Moment } as any
    }

    default:
      throw new UserInputError(`Unsupported content type: ${type}`)
  }
}

export default resolver
