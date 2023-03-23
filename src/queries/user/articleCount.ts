import { ARTICLE_STATE } from 'common/enums/index.js'
import { UserStatusToArticleCountResolver } from 'definitions'

const resolver: UserStatusToArticleCountResolver = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  const count = await atomService.count({
    table: 'article',
    where: { authorId: id, state: ARTICLE_STATE.active },
  })
  return count
}

export default resolver
