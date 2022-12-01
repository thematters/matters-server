import { HomepageContext, makeHomepage } from '@matters/ipns-site-generator'
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
      (await this.systemService.findAssetUrl(this.author.avatar))

    const articles = await this.articleService.findByAuthor(this.author.id, {
      columns: ['article.id', 'article.draft_id'],
      take: 50,
    })
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
      articles: this.publishedDrafts.map((draft) => ({
        id: draft.id,
        author: {
          userName,
          displayName,
        },
        title: draft.title,
        summary: draft.summary,
        date: draft.updatedAt,
        content: draft.content,
        tags: draft.tags || [],
        uri: `./${draft.id}-${slugify(draft.title)}/`,
        sourceUri: `${environment.siteDomain}/@${userName}/${
          draft.id
        }-${slugify(draft.title)}/`,
      })),
    }

    return makeHomepage(context)
  }
}
