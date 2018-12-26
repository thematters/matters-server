import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  root,
  { input: { id } },
  { viewer, articleService, draftService, tagService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const { id: draftDBId } = fromGlobalId(id)
  const {
    authorId,
    upstreamId,
    title,
    cover,
    summary,
    content,
    tags: tagList
  } = await draftService.dataloader.load(draftDBId)

  if (authorId !== viewer.id) {
    throw new Error('draft does not exists') // TODO
  }

  const article = await articleService.create({
    authorId,
    draftId: draftDBId,
    upstreamId,
    title,
    cover,
    summary,
    content
  })

  // TODO: trigger publication and tag creation with task queue
  await articleService.publish(article.id)

  // handle tags
  let tags = tagList
  if (tags) {
    // create tag records, return tag record if already exists
    const dbTags = ((await Promise.all(
      tags.map((tag: string) => tagService.create({ content: tag }))
    )) as unknown) as { id: string; content: string }[]

    // create article_tag record
    await Promise.all(
      dbTags.map(({ id: tagId }: { id: string }) =>
        tagService.createArticleTag({ tagId, articleId: article.id })
      )
    )
  } else {
    tags = []
  }

  // add to search
  await articleService.addToSearch({ ...article, tags })

  return article
}

export default resolver
