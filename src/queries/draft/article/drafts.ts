import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['drafts'] = async (
  { id: articleId, authorId },
  _,
  { dataSources: { atomService } }
) => {
  const versions = await atomService.findMany({
    table: 'article_version',
    where: { articleId },
    orderBy: [{ column: 'created_at', order: 'desc' }],
  })
  return versions.map(async (version) => {
    return {
      ...version,
      authorId,
      content: (
        await atomService.articleContentIdLoader.load(version.contentId)
      ).content,
      publishState: 'published',
      // unused fields in front-end
      contentMd: '',
      iscnPublish: false,
      collection: null,
      remark: null,
      archived: false,
      language: null,
    }
  })
}

export default resolver
