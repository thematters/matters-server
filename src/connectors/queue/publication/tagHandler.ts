import { environment } from 'common/environment'
import { normalizeTagInput } from 'common/utils'
import { TagService } from 'connectors/tagService'
import { Article, ArticleVersion } from 'definitions'

export class TagHandler {
  constructor(
    private readonly tagService: TagService
  ) {
    //
  }

  async handle(article: Article, articleVersion: ArticleVersion): Promise<string[]> {
    let tags = articleVersion.tags

    if (tags.length === 0) {
      return []
    }

    // get tag editor
    const tagEditors = environment.mattyId
      ? [environment.mattyId, article.authorId]
      : [article.authorId]

    // create tag records, return tag record if already exists
    const dbTags = (
      (await Promise.all(
        tags.filter(Boolean).map((content: string) =>
          this.tagService.create(
            {
              content,
              creator: article.authorId,
              editors: tagEditors,
              owner: article.authorId,
            },
            {
              columns: ['id', 'content'],
              skipCreate: normalizeTagInput(content) !== content,
            }
          )
        )
      )) as unknown as [{ id: string; content: string }]
    ).filter(Boolean)

    // create article_tag record
    await this.tagService.createArticleTags({
      articleIds: [article.id],
      creator: article.authorId,
      tagIds: dbTags.map(({ id }) => id),
    })

    return tags
  }
}
