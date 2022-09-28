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

  constructor(author: Item, keyId: string, articles: Item[]) {
    this.author = author
    this.keyId = keyId

    this.articleService = new ArticleService()
    this.draftService = new DraftService()
    this.tagService = new TagService()
    this.systemService = new SystemService()

    this.articles = articles
  }

  async loadData() {
    this.userImg =
      this.author.avatar &&
      (await this.systemService.findAssetUrl(this.author.avatar))

    const articleIds = await this.articleService.findByAuthor(this.author.id, {
      columns: ['article.id'],
      take: 50,
    })
    if (!this.articles) {
      this.articles = (await this.articleService.dataloader.loadMany(
        articleIds.map(({ id }: { id: string }) => id)
      )) as Item[]
    }
    const articles = this.articles

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

    const feed = {
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
          dataHash,
        }) => ({
          id: uuid,
          title,
          // image,
          content_html: content,
          date_published: createdAt.toISOString(),
          summary,
          tags: omitEmpty(
            this.articleTagIds
              .filter(({ articleId }) => articleId === id)
              .map(({ tagId }) => this.tagsMap.get(tagId)?.content)
              .filter(Boolean)
          ), // : (await tagService.findByArticleId({ articleId: id })).map(({ content }) => content),
          url: `./${id}-${slug}/`,
          external_url: `${
            environment.siteDomain || 'https://matters.news'
          }/@${userName}/${id}-${slug}-${mediaHash}`,
        })
      ),
    }

    return JSON.stringify(feed, null, 2)
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
      ({ id, uuid, title, slug, summary, mediaHash, dataHash, createdAt }) => {
        const linkUrl = `${
          environment.siteDomain || 'https://matters.news'
        }/@${userName}/${id}-${slug}-${mediaHash}`

        return `<item>
<title><![CDATA[${title}]]></title>
<guid>${linkUrl}</guid>
<link>${linkUrl}</link>
<pubDate>${buildRFC822Date(createdAt)}</pubDate>
<description><![CDATA[${summary}]]></description>
</item>`
      }
    )

    const siteTitle = `${displayName || userName}'s website`
    const selfLink = `https://ipfs.io/ipns/${this.keyId}/rss.xml`

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/">
<atom:link href="${selfLink}" rel="self" type="application/rss+xml" />
<channel>
  <title><![CDATA[${siteTitle}]]></title>
  <link>${home_page_url}</link>
  <description><![CDATA[${description || siteTitle}]]></description>
<image>
${this.userImg ? `<url>${this.userImg}</url>` : ''}
  <title><![CDATA[${siteTitle}]]></title>
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

    const siteTitle = `${displayName || userName}'s website`
    const description =
      stripSpaces(this.author.description) ||
      // siteTitle ||
      'Matters 致力搭建去中心化的寫作社群與內容生態。基於 IPFS 技術，令創作不受制於任何平台，獨立性得到保障；引入加密貨幣，以收入的形式回饋給作者；代碼開源，建立創作者自治社區。'

    const home_page_url = `${
      environment.siteDomain || 'https://matters.news'
    }/@${userName}`

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
<a href="./${id}-${slug}/"><h2>${title}</h2></a>
<p>${summary}</p>
</li>`
    )

    const publishedDate = (
      this.articles?.[0]?.createdAt || new Date()
    ).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<title>${siteTitle}</title>
<meta name="description" content="${description}">

<link rel="alternate" type="application/rss+xml" href="./rss.xml" title="${siteTitle}" />
<link rel="alternate" type="application/feed+json" href="./feed.json" title="${siteTitle}" />
<link rel="canonical" href="${home_page_url}" />

<meta property="og:title" content="${siteTitle}">
<meta property="og:description" content="${description}">
<meta property="article:author" content="${displayName} (@${userName})">
<meta name="twitter:title" content="${siteTitle}">
<meta name="twitter:description" content="${description}">

<style>
main { max-width: 44rem; margin: 2.5rem auto; padding: 0 1.25rem; }
h1 { text-align: center; }
p.author-description { white-space: pre-wrap; }
figure.byline { margin: 0; }
figure.byline time { color: grey; }
figure.byline * + * { padding-left: 0.625rem; }
ol, ul { padding-left: 0; }
li.item { list-style: none; }
li.item h2 { margin: 0.25rem auto; }
li.item + li.item { margin-top: 1.5rem; }
li.item span { font-size: smaller; color: grey; }
</style>
</head>
<body itemscope itemtype="http://schema.org/Article">

<!-- TODO: more elements to enrich -->

<main>
<header>
<h1>${siteTitle}</h1>
${
  this.author.description
    ? `<p class="author-description">${this.author.description}</p>`
    : ''
}
<figure class="byline">
  <a href="${mattersAuthorLink}" target="_blank">${displayName} (@${userName})</a>
  <time itemprop="datePublished" datetime="${publishedDate}">${publishedDate}</time>
  <span itemprops="provider" itemscope itemtype="http://schema.org/Organization">
    from <a href="https://matters.news" target="_blank" itemprops="name">Matters</a>
    <meta itemprops="url" content="https://matters.news">
  </span>
</figure>
</header>

<article itemprop="articleBody">
<ol style="margin-top: 3rem;">
${items.join('\n')}
</ol>
</article>
</main>

<script async src="https://www.googletagmanager.com/gtag/js?id=G-K4KK55LL24"></script>
<script>window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date); gtag('config', 'G-K4KK55LL24');</script>
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

// https://github.com/whitep4nth3r/rfc-822/blob/main/index.js
function buildRFC822Date(date: Date) {
  const dayStrings = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const monthStrings = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]

  const day = dayStrings[date.getUTCDay()]
  const dayNumber = addLeadingZero(date.getUTCDate())
  const month = monthStrings[date.getUTCMonth()]
  const year = date.getUTCFullYear()
  const time = `${addLeadingZero(date.getUTCHours())}:${addLeadingZero(
    date.getUTCMinutes()
  )}:00`

  return `${day}, ${dayNumber} ${month} ${year} ${time} GMT`
}

function addLeadingZero(num: number, len: number = 2) {
  return `00${num}`.slice(-len)
}
