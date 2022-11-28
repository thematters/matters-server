import { HomepageContext, makeHomepage } from '@matters/ipns-site-generator'

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
  keyId: string // the ipns key

  // internal use
  publishedDrafts: Item[]
  articleTagIds: Item[]
  tagsMap: Map<string, Item>
  userImg?: string | null;
  [k: string]: any

  articleService: InstanceType<typeof ArticleService>
  draftService: InstanceType<typeof DraftService>
  tagService: InstanceType<typeof TagService>
  systemService: InstanceType<typeof SystemService>

  constructor(author: Item, keyId: string, drafts: Item[]) {
    this.author = author
    this.keyId = keyId

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
      columns: ['article.id'],
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
        date: draft.publishedAt,
        content: draft.content,
        tags: draft.tags || [],
        uri: `./${draft.id}-${draft.slug}/`,
        sourceUri: `${environment.siteDomain}/@${userName}/${draft.id}-${draft.slug}/`,
      })),
    }

    return makeHomepage(context)
  }
}
