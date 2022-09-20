import { environment } from 'common/environment'
import { stripSpaces } from 'common/utils'
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
    const {
      userName,
      displayName,
      // description,
    } = this.author
    const description = stripSpaces(this.author.description)

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
            uuid,
            title,
            slug,
            summary,
            cover,
            content,
            createdAt,
            mediaHash,
          }) => ({
            id: uuid,
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
    const {
      userName,
      displayName,
      // description,
    } = this.author
    const description = stripSpaces(this.author.description)

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
<title>${title}</title>
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
${items.join('\n')}
</channel>
</rss>`
  }

  ['index.html']() {
    // TODO
    const {
      userName,
      displayName,
      // description,
    } = this.author
    const description = stripSpaces(this.author.description)

    const home_page_url = `${
      environment.siteDomain || 'https://matters.news'
    }/@${userName}`

    const siteTitle = `${displayName || userName}'s website`
    const mattersAuthorLink = `${
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
      }) => `<li class="item">
<span>${createdAt.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}</span>
<a href="${mattersAuthorLink}/${id}-${slug}-${mediaHash}"><h2>${title}</h2></a>
<p>${summary}</p>
</li>`
    )

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { margin: 0 auto; max-width: 768px; }
h1 { text-align: center; }
p.author-description { white-space: pre-wrap; }
li.item { margin-top: 1rem; list-style: none; }
li.item span { font-size: smaller; color: grey; }
</style>

<link rel="alternate" type="application/rss+xml" href="./rss.xml" title="${siteTitle}" />
<link rel="alternate" type="application/feed+json" href="./feed.json" title="${siteTitle}" />
<link rel="canonical" href="${home_page_url}" />
<meta name="description" content="${
      description ||
      siteTitle ||
      'Matters 致力搭建去中心化的寫作社群與內容生態。基於 IPFS 技術，令創作不受制於任何平台，獨立性得到保障；引入加密貨幣，以收入的形式回饋給作者；代碼開源，建立創作者自治社區。'
    }">

<title>${siteTitle}</title>
</head>
<body>

<!-- TODO: more elements to enrich -->

<h1>${siteTitle}</h1>
<p class="author-description">${this.author.description || ''}</p>
<span>from <a href="${mattersAuthorLink}" target="_blank">Matters</a></span>

<ol>
${items.join('\n')}
</ol>

<script async src="https://www.googletagmanager.com/gtag/js?id=G-K4KK55LL24"></script>
<script> window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date); gtag('config', 'G-K4KK55LL24'); </script>

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
