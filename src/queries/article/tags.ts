import { ArticleToTagsResolver } from 'definitions'

const resolver: ArticleToTagsResolver = async (
  { id },
  _,
  { dataSources: { articleService, tagService } }
) => {
  const tagIds = await articleService.findTagIds({ id })
  return tagService.dataloader.loadMany(tagIds)
}

export default resolver
