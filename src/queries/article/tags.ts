import { ArticleToTagsResolver } from 'definitions'

const resolver: ArticleToTagsResolver = async (
  { articleId },
  _,
  { dataSources: { articleService, tagService } }
) => {
  const tagIds = await articleService.findTagIds({ id: articleId })
  return tagService.dataloader.loadMany(tagIds)
}

export default resolver
