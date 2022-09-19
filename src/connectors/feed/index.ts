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
  articles: Item[]
  articleTagIds: Item[]
  tagsMap: Map<string, Item>
  userImg?: string | null;
  [k: string]: any

  articleService: InstanceType<typeof ArticleService>
  draftService: InstanceType<typeof DraftService>
  tagService: InstanceType<typeof TagService>
  systemService: InstanceType<typeof SystemService>

  constructor(author: Item, keyId: string) {
    this.author = author
    this.keyId = keyId

    this.articleService = new ArticleService()
    this.draftService = new DraftService()
    this.tagService = new TagService()
    this.systemService = new SystemService()
  }

  async loadData() {
    this.userImg =
      this.author.avatar &&
      (await this.systemService.findAssetUrl(this.author.avatar))

    const articleIds = await this.articleService.findByAuthor(this.author.id, {
      columns: ['article.id'],
      take: 50,
    })
    const articles = (this.articles =
      (await this.articleService.dataloader.loadMany(
        articleIds.map(({ id }: { id: string }) => id)
      )) as Item[])

    const articleTagIds = (this.articleTagIds =
      await this.tagService.findByArticleIds({
        articleIds: articles.map(({ id }) => id),
      }))
    const tags = (await this.tagService.dataloader.loadMany(
      Array.from(new Set(articleTagIds.map(({ tagId }) => tagId)))
    )) as Item[]
    this.tagsMap = new Map(tags.map((tag) => [tag.id, tag]))
  }

  ['feed.json']() {
    const { userName, description, displayName } = this.author

    const home_page_url = `${
      environment.siteDomain || 'https://matters.news'
    }/@${userName}`

    return JSON.stringify(
      {
        version: 'https://jsonfeed.org/version/1.1',
        title: `${displayName || userName}'s Matters JSON Feed`,
        icon: this.userImg || undefined, // fallback to default asset
        home_page_url,
        feed_url: `https://ipfs.io/ipns/${this.keyId}/feed.json`,
        description: description || undefined, // omit by undefined if empty
        authors: [
          {
            name: displayName,
            url: home_page_url, // `${environment.siteDomain}/@${userName}`,
            avatar: this.userImg || undefined, // fallback to default asset
          },
        ],
        items: this.articles.map(
          ({
            id,
            title,
            slug,
            summary,
            cover,
            content,
            createdAt,
            mediaHash,
          }) => ({
            id,
            title,
            // image,
            content_html: content,
            date_published: createdAt?.toISOString(),
            summary,
            tags: omitEmpty(
              this.articleTagIds
                .filter(({ articleId }) => articleId === id)
                .map(({ tagId }) => this.tagsMap.get(tagId)?.content)
                .filter(Boolean)
            ),
            // : (await tagService.findByArticleId({ articleId: id })).map(({ content }) => content),
            url: `${
              environment.siteDomain || 'https://matters.news'
            }/@${userName}/${id}-${slug}-${mediaHash}`,
          })
        ),
      },
      null,
      2
    )
  }

  ['rss.xml']() {
    // TODO

    const { userName, description, displayName } = this.author

    const home_page_url = `${
      environment.siteDomain || 'https://matters.news'
    }/@${userName}`

    const items = this.articles.map(
      ({
        id,
        uuid,
        title,
        slug,
        summary,
        mediaHash,
        dataHash,
        createdAt,
      }) => `<item>
<title>{title}</title>
<link>${
        environment.siteDomain || 'https://matters.news'
      }/@${userName}/${id}-${slug}-${mediaHash}</link>
<guid>${uuid}</guid>
<pubDate>${createdAt.toISOString()}</pubDate>
<description>${summary}</description>
</item>
`
    )

    const siteTitle = `${displayName || userName}'s website`

    return `<rss version="2.0">
<channel>
  <title>${siteTitle}</title>
  <link>${home_page_url}</link>
  <description>${description || siteTitle}</description>
<image>
  <url>${this.userImg}</url>
  <title>${siteTitle}</title>
  <link>${home_page_url}</link>
</image>
${items}
</channel>
</rss>`
  }

  ['index.html']() {
    // TODO

    const { userName, description, displayName } = this.author

    const home_page_url = `${
      environment.siteDomain || 'https://matters.news'
    }/@${userName}`

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
</style>

<link rel="alternate" type="application/rss+xml" href="./feed.xml" title="${
      displayName || userName
    }'s website">
<link rel="canonical" href="${home_page_url}">
<meta name="description" content="${
      description ||
      'Matters 致力搭建去中心化的寫作社群與內容生態。基於 IPFS 技術，令創作不受制於任何平台，獨立性得到保障；引入加密貨幣，以收入的形式回饋給作者；代碼開源，建立創作者自治社區。'
    }">

<title> ${displayName || userName}'s website </title>
</head>
<body>

<!-- TODO -->

</body>

</html>`
  }
}

function omitEmpty(arr: any[]) {
  if (arr?.length > 0) {
    return arr
  }
  // otherwise undefined
}
