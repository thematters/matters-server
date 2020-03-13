import { fromGlobalId } from 'common/utils'
import { TagToSelectedArgs } from 'definitions'

const resolver: TagToSelectedArgs = async (
  { id },
  { input },
  { dataSources: { tagService, articleService } }
) => {
  const articleId = fromGlobalId(input.id).id

  return tagService.isArticleSelected({
    articleId,
    tagId: id
  })
}

export default resolver
