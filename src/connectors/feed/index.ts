import { HomepageContext, makeHomepage } from '@matters/ipns-site-generator'

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

  async ['feed.json']() {
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
      title: `${(displayName || userName).trim()}`,
      icon: this.userImg || undefined, // fallback to default asset
      home_page_url,
      // feed_url: `https://ipfs.io/ipns/${this.keyId}/feed.json`,
      description: description || undefined, // omit by undefined if empty
      authors: [
        {
          name: displayName,
          url: home_page_url, // `${environment.siteDomain}/@${userName}`,
          avatar: this.userImg || undefined, // fallback to default asset
        },
      ],
      items: await Promise.all(
        this.articles.map(
          async ({
            id,
            uuid,
            title,
            slug,
            summary,
            cover,
            content,
            createdAt,
            // mediaHash,
            dataHash,
          }) => ({
            id: uuid,
            title,
            image: (await this.systemService.findAssetUrl(cover)) || undefined,
            content_html: content,
            summary: stripSpaces(summary),
            date_published: createdAt.toISOString(),
            tags: omitEmpty(
              this.articleTagIds
                .filter(({ articleId }) => articleId === id)
                .map(({ tagId }) => this.tagsMap.get(tagId)?.content)
                .filter(Boolean)
            ), // : (await tagService.findByArticleId({ articleId: id })).map(({ content }) => content),
            url: `./${id}-${slug}/`,
            external_url: `${
              environment.siteDomain || 'https://matters.news'
            }/@${userName}/${id}-${slug}`,
          })
        )
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
      ({
        id,
        uuid,
        title,
        slug,
        summary, // mediaHash,
        dataHash,
        createdAt,
      }) => {
        const linkUrl = `${
          environment.siteDomain || 'https://matters.news'
        }/@${userName}/${id}-${encodeURIComponent(slug)}`

        return `<item>
<title><![CDATA[${title}]]></title>
<guid>${linkUrl}</guid>
<link>${linkUrl}</link>
<pubDate>${buildRFC822Date(createdAt)}</pubDate>
<description><![CDATA[${stripSpaces(summary)}]]></description>
</item>`
      }
    )

    const siteTitle = (displayName || userName).trim() // `${displayName || userName}'s website`
    // const selfLink = `https://ipfs.io/ipns/${this.keyId}/rss.xml`
    // <atom:link href="${selfLink}" rel="self" type="application/rss+xml" />

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  xmlns:content="http://purl.org/rss/1.0/modules/content/"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:media="http://search.yahoo.com/mrss/">
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

  async ['index.html']() {
    const { userName, displayName, description, avatar } = this.author
    const avatarImg = await this.systemService.findAssetUrl(avatar)

    const context: HomepageContext = {
      meta: {
        title: `${displayName} (${userName}) - Matters`,
        description,
        authorName: displayName,
        image: avatarImg || undefined,
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
            ipns: this.ipnsKey,
            xml: './rss.xml',
            json: './rss.json',
          }
        : undefined,
      articles: this.articles.map((a) => ({
        author: {
          userName,
          displayName,
        },
        title: a.title,
        summary: a.summary,
        date: a.publishedAt,
        content: a.content,
        uri: `./${a.id}-${a.slug}/`,
      })),
    }

    return makeHomepage(context)
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
