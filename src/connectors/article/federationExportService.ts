import type { Connections } from '#definitions/index.js'
import type { HomepageContext } from '@matters/ipns-site-generator'
import type { Knex } from 'knex'

import {
  ARTICLE_ACCESS_TYPE,
  ARTICLE_STATE,
  USER_STATE,
} from '#common/enums/index.js'
import {
  makeActivityPubBundles,
  makeHomepageBundles,
} from '@matters/ipns-site-generator'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type FederationExportAuthor = {
  id: string
  userName: string | null
  displayName: string | null
  description?: string | null
  state?: string | null
  ipnsKey?: string | null
  federationSetting?: FederationAuthorSetting | null
}

export type FederationExportArticleRow = {
  articleId: string
  articleState: string
  shortHash?: string | null
  title: string
  summary: string
  content: string
  tags?: string[] | null
  access: string
  circleId?: string | null
  coverUrl?: string | null
  createdAt: Date | string
  updatedAt?: Date | string | null
  federationSetting?: FederationArticleSetting | null
  author: FederationExportAuthor
}

export const FEDERATION_AUTHOR_SETTING = {
  enabled: 'enabled',
  disabled: 'disabled',
} as const

export const FEDERATION_ARTICLE_SETTING = {
  inherit: 'inherit',
  enabled: 'enabled',
  disabled: 'disabled',
} as const

export type FederationAuthorSetting =
  (typeof FEDERATION_AUTHOR_SETTING)[keyof typeof FEDERATION_AUTHOR_SETTING]

export type FederationArticleSetting =
  (typeof FEDERATION_ARTICLE_SETTING)[keyof typeof FEDERATION_ARTICLE_SETTING]

export type FederationExportGateInput = {
  row: FederationExportArticleRow
  authorSetting?: FederationAuthorSetting | null
  articleSetting?: FederationArticleSetting | null
}

export type FederationExportGateResult = {
  eligible: boolean
  reason:
    | 'eligible'
    | 'article_not_public'
    | 'author_not_opted_in'
    | 'article_disabled'
  effectiveArticleSetting: FederationArticleSetting
}

export type FederationExportBundleInput = {
  rows: FederationExportArticleRow[]
  siteDomain: string
  webfDomain: string
  generatedAt?: Date | string
  actor?: Partial<FederationExportAuthor>
  enforceFederationGate?: boolean
}

export type FederationExportFile = {
  path: string
  content: string
}

export type FederationExportBundle = {
  context: HomepageContext
  files: FederationExportFile[]
  manifest: FederationExportManifest
}

export type FederationExportManifest = {
  version: 1
  generatedAt: string
  generator: {
    package: '@matters/ipns-site-generator'
    mode: 'homepage-and-activitypub'
  }
  visibility: {
    federatedPublicOnly: true
  }
  actor: {
    handle: string
    displayName: string
    webfingerSubject: string
    sourceProfileUrl: string
    sourceActorId: string
  }
  files: {
    homepage: string
    rss: string
    feed: string
    webfinger: string
    actor: string
    outbox: string
  }
  articles: Array<{
    id: string
    sourceUri: string
    visibility: 'public'
  }>
}

type ArticleExportQueryRow = {
  articleId: string
  articleState: string
  shortHash: string | null
  title: string
  summary: string
  content: string
  tags: string[] | null
  access: string
  circleId: string | null
  createdAt: Date
  updatedAt: Date
  authorId: string
  userName: string | null
  displayName: string | null
  authorDescription: string | null
  authorState: string | null
  ipnsKey: string | null
  authorFederationSetting?: FederationAuthorSetting | null
  articleFederationSetting?: FederationArticleSetting | null
}

export const isFederationPublicArticleRow = (row: FederationExportArticleRow) =>
  row.articleState === ARTICLE_STATE.active &&
  row.access === ARTICLE_ACCESS_TYPE.public &&
  row.author.state !== USER_STATE.archived &&
  !!row.author.userName &&
  !!row.author.displayName

export const resolveFederationExportGate = ({
  row,
  authorSetting,
  articleSetting,
}: FederationExportGateInput): FederationExportGateResult => {
  const effectiveArticleSetting =
    articleSetting ?? FEDERATION_ARTICLE_SETTING.inherit

  if (!isFederationPublicArticleRow(row)) {
    return {
      eligible: false,
      reason: 'article_not_public',
      effectiveArticleSetting,
    }
  }

  if (effectiveArticleSetting === FEDERATION_ARTICLE_SETTING.disabled) {
    return {
      eligible: false,
      reason: 'article_disabled',
      effectiveArticleSetting,
    }
  }

  if (authorSetting !== FEDERATION_AUTHOR_SETTING.enabled) {
    return {
      eligible: false,
      reason: 'author_not_opted_in',
      effectiveArticleSetting,
    }
  }

  return {
    eligible: true,
    reason: 'eligible',
    effectiveArticleSetting,
  }
}

export const resolveFederationExportGateForRow = (
  row: FederationExportArticleRow
) =>
  resolveFederationExportGate({
    row,
    authorSetting: row.author.federationSetting,
    articleSetting: row.federationSetting,
  })

const toIsoString = (value: Date | string) => new Date(value).toISOString()

export const buildMattersArticleUrl = ({
  siteDomain,
  articleId,
  shortHash,
}: {
  siteDomain: string
  articleId: string
  shortHash?: string | null
}) => `https://${siteDomain}/a/${shortHash || articleId}`

export const buildFederationHomepageContext = ({
  rows,
  siteDomain,
  webfDomain,
  generatedAt = new Date(),
  actor,
  enforceFederationGate = false,
}: FederationExportBundleInput): HomepageContext => {
  const publicRows = rows.filter((row) =>
    enforceFederationGate
      ? resolveFederationExportGateForRow(row).eligible
      : isFederationPublicArticleRow(row)
  )
  if (publicRows.length === 0) {
    throw new Error('No selected public articles are eligible for federation')
  }

  const firstAuthor = publicRows[0].author
  const author = {
    ...firstAuthor,
    ...actor,
  }
  if (!author.userName || !author.displayName) {
    throw new Error('Federation actor requires userName and displayName')
  }

  const sourceProfileUrl = `https://${siteDomain}/@${author.userName}`
  const articleDigests = publicRows.map((row) => {
    const sourceUri = buildMattersArticleUrl({
      siteDomain,
      articleId: row.articleId,
      shortHash: row.shortHash,
    })

    return {
      id: row.articleId,
      author: {
        userName: author.userName!,
        displayName: author.displayName!,
        description: author.description ?? undefined,
      },
      title: row.title,
      summary: row.summary,
      date: toIsoString(row.createdAt),
      image: row.coverUrl ?? undefined,
      content: row.content,
      tags: row.tags ?? [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt ?? row.createdAt,
      access: row.access,
      status: row.articleState,
      uri: sourceUri,
      sourceUri,
    }
  })

  return {
    meta: {
      siteDomain,
      title: `${author.displayName} on Matters`,
      description:
        author.description ||
        `Public Matters articles by ${author.displayName}`,
      authorName: author.displayName,
    },
    byline: {
      date: toIsoString(generatedAt),
      author: {
        userName: author.userName,
        displayName: author.displayName,
        description: author.description ?? undefined,
        name: `${author.displayName} (${author.userName})`,
        uri: sourceProfileUrl,
        ipnsKey: author.ipnsKey ?? undefined,
        webfDomain,
      },
      website: {
        name: 'Matters',
        uri: `https://${siteDomain}`,
      },
    },
    articles: articleDigests,
  }
}

export const buildFederationExportManifest = (
  context: HomepageContext,
  generatedAt: Date | string
): FederationExportManifest => {
  const author = context.byline.author
  const webfDomain = author.webfDomain
  if (!webfDomain) {
    throw new Error('Federation actor requires webfDomain')
  }

  return {
    version: 1,
    generatedAt: toIsoString(generatedAt),
    generator: {
      package: '@matters/ipns-site-generator',
      mode: 'homepage-and-activitypub',
    },
    visibility: {
      federatedPublicOnly: true,
    },
    actor: {
      handle: author.userName,
      displayName: author.displayName,
      webfingerSubject: `acct:${author.userName}@${webfDomain}`,
      sourceProfileUrl: author.uri,
      sourceActorId: `https://${webfDomain}/about.jsonld`,
    },
    files: {
      homepage: 'index.html',
      rss: 'rss.xml',
      feed: 'feed.json',
      webfinger: '.well-known/webfinger',
      actor: 'about.jsonld',
      outbox: 'outbox.jsonld',
    },
    articles: context.articles.map((article) => ({
      id: article.id,
      sourceUri: article.sourceUri,
      visibility: 'public',
    })),
  }
}

export const buildFederationExportBundle = (
  input: FederationExportBundleInput
): FederationExportBundle => {
  const generatedAt = input.generatedAt ?? new Date()
  const context = buildFederationHomepageContext({
    ...input,
    generatedAt,
  })
  const manifest = buildFederationExportManifest(context, generatedAt)
  const files = [
    ...makeHomepageBundles(context),
    ...makeActivityPubBundles(context),
    {
      path: 'activitypub-manifest.json',
      content: JSON.stringify(manifest, null, 2),
    },
  ]

  return { context, files, manifest }
}

const resolveBundleOutputPath = ({
  outputDir,
  filePath,
}: {
  outputDir: string
  filePath: string
}) => {
  const root = path.resolve(outputDir)
  const outputPath = path.resolve(root, filePath)
  const relativePath = path.relative(root, outputPath)

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Unsafe federation export file path: ${filePath}`)
  }

  return outputPath
}

export const writeFederationExportBundle = async ({
  bundle,
  outputDir,
}: {
  bundle: FederationExportBundle
  outputDir: string
}) => {
  const root = path.resolve(outputDir)
  const written: string[] = []
  const filesByPath = new Map(
    bundle.files.map((file) => [file.path, file.content])
  )

  await mkdir(root, { recursive: true })

  for (const [filePath, content] of filesByPath) {
    const outputPath = resolveBundleOutputPath({
      outputDir: root,
      filePath,
    })

    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(outputPath, content, 'utf8')
    written.push(path.relative(root, outputPath))
  }

  return written.sort()
}

export class FederationExportService {
  private knexRO: Knex

  public constructor(connections: Connections) {
    this.knexRO = connections.knexRO
  }

  public async loadSelectedArticleRows(
    articleIds: string[],
    options: { includeFederationSettings?: boolean } = {}
  ): Promise<FederationExportArticleRow[]> {
    if (articleIds.length === 0) {
      throw new Error('Explicit articleIds are required for federation export')
    }

    const query = this.knexRO<ArticleExportQueryRow>('article')
      .join('article_version_newest as articleVersion', {
        'articleVersion.articleId': 'article.id',
      })
      .join('article_content as articleContent', {
        'articleContent.id': 'articleVersion.contentId',
      })
      .join('user as author', {
        'author.id': 'article.authorId',
      })
      .leftJoin('user_ipns_keys as ipnsKey', {
        'ipnsKey.userId': 'author.id',
      })
      .whereIn('article.id', articleIds)
      .select([
        'article.id as articleId',
        'article.state as articleState',
        'article.shortHash as shortHash',
        'articleVersion.title as title',
        'articleVersion.summary as summary',
        'articleContent.content as content',
        'articleVersion.tags as tags',
        'articleVersion.access as access',
        'articleVersion.circleId as circleId',
        'articleVersion.createdAt as createdAt',
        'articleVersion.updatedAt as updatedAt',
        'author.id as authorId',
        'author.userName as userName',
        'author.displayName as displayName',
        'author.description as authorDescription',
        'author.state as authorState',
        'ipnsKey.ipnsKey as ipnsKey',
      ])

    if (options.includeFederationSettings) {
      query
        .leftJoin('user_federation_setting as authorFederation', {
          'authorFederation.userId': 'author.id',
        })
        .leftJoin('article_federation_setting as articleFederation', {
          'articleFederation.articleId': 'article.id',
        })
        .select([
          'authorFederation.state as authorFederationSetting',
          'articleFederation.state as articleFederationSetting',
        ])
    }

    const rows = await query

    const rowsByArticleId = new Map(rows.map((row) => [row.articleId, row]))

    return articleIds
      .map((articleId) => rowsByArticleId.get(articleId))
      .filter((row): row is ArticleExportQueryRow => !!row)
      .map((row) => ({
        articleId: row.articleId,
        articleState: row.articleState,
        shortHash: row.shortHash,
        title: row.title,
        summary: row.summary,
        content: row.content,
        tags: row.tags ?? [],
        access: row.access,
        circleId: row.circleId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        federationSetting: row.articleFederationSetting,
        author: {
          id: row.authorId,
          userName: row.userName,
          displayName: row.displayName,
          description: row.authorDescription,
          state: row.authorState,
          ipnsKey: row.ipnsKey,
          federationSetting: row.authorFederationSetting,
        },
      }))
  }
}
