import {
  // HomepageArticleDigest,
  HomepageContext,
  makeHomepage,
} from '@matters/ipns-site-generator'
import slugify from '@matters/slugify'

import { environment } from 'common/environment'
import {
  ArticleService,
  DraftService,
  SystemService,
  TagService,
} from 'connectors'
import { Item } from 'definitions'

export class Feed {
  author: Item
  ipnsKey: string // the ipns key

  // internal use
  publishedDrafts: Item[]
  userImg?: string | null
  articles?: Map<string, Item>

  articleService: InstanceType<typeof ArticleService>
  draftService: InstanceType<typeof DraftService>
  tagService: InstanceType<typeof TagService>
  systemService: InstanceType<typeof SystemService>

  constructor(author: Item, ipnsKey: string, drafts: Item[]) {
    this.author = author
    this.ipnsKey = ipnsKey

    this.articleService = new ArticleService()
    this.draftService = new DraftService()
    this.systemService = new SystemService()

    this.publishedDrafts = drafts
  }

  async loadData() {
    this.userImg =
      this.author.avatar &&
      (await this.systemService.findAssetUrl(this.author.avatar, true))

    const articles = await this.articleService.findByAuthor(this.author.id, {
      columns: [
        'article.id',
        'article.draft_id',
        'article.uuid',
        'article.slug',
        'article.created_at',
      ],
      take: 50,
    }) // as Item[]
    this.articles = new Map(articles.map((item: Item) => [item.id, item]))

    const publishedDraftIds = articles.map(
      ({ draftId }: { draftId: string }) => draftId
    )

    if (!this.publishedDrafts) {
      this.publishedDrafts = (
        (await this.draftService.dataloader.loadMany(
          publishedDraftIds
        )) as Item[]
      ).filter(Boolean)
    }
  }

  generate() {
    const { userName, displayName, description } = this.author

    const context: HomepageContext = {
      meta: {
        title: `${displayName} (${userName}) - Matters`,
        description,
        authorName: displayName,
        image: this.userImg || undefined,
      },
      byline: {
        author: {
          name: `${displayName} (${userName})`,
          uri: `${environment.siteDomain}/@${userName}`,
        },
        website: {
          name: 'Matters',
          uri: environment.siteDomain,
        },
      },
      rss: this.ipnsKey
        ? {
            ipnsKey: this.ipnsKey,
            xml: './rss.xml',
            json: './feed.json',
          }
        : undefined,
      articles: this.publishedDrafts
        .map((draft) => {
          const arti = this.articles?.get(draft.articleId)
          if (arti) {
            return {
              id: arti.uuid ?? draft.articleId ?? draft.id,
              author: {
                userName,
                displayName,
              },
              title: draft.title,
              summary: draft.summary,
              // date: draft.updatedAt,
              date: arti.createdAt, // || draft.updatedAt,
              content: draft.content,
              tags: draft.tags || [],
              uri: `./${draft.articleId}-${arti.slug ?? slugify(draft.title)}/`,
              sourceUri: `${environment.siteDomain}/@${userName}/${
                arti.id ?? draft.articleId
              }-${arti.slug ?? slugify(draft.title)}/`,
            }
          }
        })
        .filter(Boolean) as any[],
    }

    return makeHomepage(context)
  }
}
