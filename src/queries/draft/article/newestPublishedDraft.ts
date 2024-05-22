import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['newestPublishedDraft'] = async (
  { id: articleId, authorId },
  _,
  { dataSources: { atomService } }
) => {
  const version = await atomService.findFirst({
    table: 'article_version',
    where: { articleId },
    orderBy: [{ column: 'created_at', order: 'desc' }],
  })
  return {
    ...version,
    authorId,
    content: (await atomService.articleContentIdLoader.load(version.contentId))
      .content,
    publishState: 'published',
    // unused fields in front-end
    contentMd: '',
    iscnPublish: false,
    collection: null,
    remark: null,
    archived: false,
    language: null,
  }
}

export default resolver
