import { APPRECIATION_PURPOSE } from 'common/enums'
import { ArticleToHasAppreciateResolver } from 'definitions'

const resolver: ArticleToHasAppreciateResolver = async (
  { articleId },
  _,
  { viewer, dataSources: { atomService } }
) => {
  if (!viewer.id) {
    return false
  }

  const record = await atomService.findFirst({
    table: 'appreciation',
    where: {
      senderId: viewer.id,
      referenceId: articleId,
      purpose: APPRECIATION_PURPOSE.appreciate,
    },
  })

  return record > 0
}

export default resolver
