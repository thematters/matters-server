import {
  ARTICLE_ACCESS_TYPE,
  ARTICLE_STATE,
  USER_STATE,
} from '#common/enums/index.js'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import {
  buildFederationExportBundle,
  buildFederationHomepageContext,
  buildMattersArticleUrl,
  FederationExportBundle,
  isFederationPublicArticleRow,
  FederationExportArticleRow,
  writeFederationExportBundle,
} from '#connectors/article/federationExportService.js'

const publicRow = (
  overrides: Partial<FederationExportArticleRow> = {}
): FederationExportArticleRow => ({
  articleId: '101',
  articleState: ARTICLE_STATE.active,
  shortHash: 'abc123',
  title: '公開長文',
  summary: '一篇公開長文摘要',
  content: '<p>公開內容</p>',
  tags: ['Fediverse'],
  access: ARTICLE_ACCESS_TYPE.public,
  createdAt: new Date('2026-05-02T00:00:00.000Z'),
  updatedAt: new Date('2026-05-02T01:00:00.000Z'),
  author: {
    id: '1',
    userName: 'mashbean',
    displayName: 'Mashbean',
    description: 'Matters author',
    state: USER_STATE.active,
    ipnsKey: 'k51example',
  },
  ...overrides,
})

describe('federationExportService', () => {
  test('builds canonical Matters article URLs from short hashes', () => {
    expect(
      buildMattersArticleUrl({
        siteDomain: 'matters.town',
        articleId: '101',
        shortHash: 'abc123',
      })
    ).toBe('https://matters.town/a/abc123')
  })

  test('accepts only active public articles with usable author identity', () => {
    expect(isFederationPublicArticleRow(publicRow())).toBe(true)
    expect(
      isFederationPublicArticleRow(
        publicRow({ access: ARTICLE_ACCESS_TYPE.paywall })
      )
    ).toBe(false)
    expect(
      isFederationPublicArticleRow(
        publicRow({ articleState: ARTICLE_STATE.archived })
      )
    ).toBe(false)
    expect(
      isFederationPublicArticleRow(
        publicRow({
          author: { ...publicRow().author, state: USER_STATE.archived },
        })
      )
    ).toBe(false)
  })

  test('builds homepage context and excludes non-public selected rows', () => {
    const context = buildFederationHomepageContext({
      rows: [
        publicRow(),
        publicRow({
          articleId: '102',
          shortHash: 'private',
          access: ARTICLE_ACCESS_TYPE.paywall,
        }),
      ],
      siteDomain: 'matters.town',
      webfDomain: 'staging-gateway.matters.town',
      generatedAt: '2026-05-02T02:00:00.000Z',
    })

    expect(context.byline.author.userName).toBe('mashbean')
    expect(context.byline.author.webfDomain).toBe(
      'staging-gateway.matters.town'
    )
    expect(context.articles).toHaveLength(1)
    expect(context.articles[0].sourceUri).toBe('https://matters.town/a/abc123')
  })

  test('fails closed when no selected public article can be exported', () => {
    expect(() =>
      buildFederationHomepageContext({
        rows: [publicRow({ access: ARTICLE_ACCESS_TYPE.paywall })],
        siteDomain: 'matters.town',
        webfDomain: 'staging-gateway.matters.town',
      })
    ).toThrow('No selected public articles')
  })

  test('generates homepage, ActivityPub files, and gateway manifest', () => {
    const bundle = buildFederationExportBundle({
      rows: [publicRow()],
      siteDomain: 'matters.town',
      webfDomain: 'staging-gateway.matters.town',
      generatedAt: '2026-05-02T02:00:00.000Z',
    })
    const paths = bundle.files.map((file) => file.path)
    const outbox = JSON.parse(
      bundle.files.find((file) => file.path === 'outbox.jsonld')!.content
    )

    expect(paths).toEqual(
      expect.arrayContaining([
        'index.html',
        'rss.xml',
        'feed.json',
        '.well-known/webfinger',
        'about.jsonld',
        'outbox.jsonld',
        'activitypub-manifest.json',
      ])
    )
    expect(bundle.manifest.actor.webfingerSubject).toBe(
      'acct:mashbean@staging-gateway.matters.town'
    )
    expect(bundle.manifest.version).toBe(1)
    expect(bundle.manifest.visibility.federatedPublicOnly).toBe(true)
    expect(outbox.orderedItems[0].object.type).toBe('Article')
  })

  test('writes generated files to a local output directory', async () => {
    const outputDir = await mkdtemp(
      path.join(tmpdir(), 'matters-federation-export-')
    )

    try {
      const bundle = buildFederationExportBundle({
        rows: [publicRow()],
        siteDomain: 'matters.town',
        webfDomain: 'staging-gateway.matters.town',
        generatedAt: '2026-05-02T02:00:00.000Z',
      })
      const written = await writeFederationExportBundle({
        bundle,
        outputDir,
      })
      const manifest = JSON.parse(
        await readFile(
          path.join(outputDir, 'activitypub-manifest.json'),
          'utf8'
        )
      )

      expect(written).toEqual(
        expect.arrayContaining([
          '.well-known/webfinger',
          'about.jsonld',
          'activitypub-manifest.json',
          'outbox.jsonld',
        ])
      )
      expect(manifest.actor.webfingerSubject).toBe(
        'acct:mashbean@staging-gateway.matters.town'
      )
      expect(manifest.version).toBe(1)
      expect(manifest.visibility.federatedPublicOnly).toBe(true)
      expect(
        written.filter((file) => file === 'activitypub-manifest.json')
      ).toHaveLength(1)
    } finally {
      await rm(outputDir, { force: true, recursive: true })
    }
  })

  test('rejects generated file paths outside the output directory', async () => {
    const outputDir = await mkdtemp(
      path.join(tmpdir(), 'matters-federation-export-')
    )
    const safeBundle = buildFederationExportBundle({
      rows: [publicRow()],
      siteDomain: 'matters.town',
      webfDomain: 'staging-gateway.matters.town',
      generatedAt: '2026-05-02T02:00:00.000Z',
    })
    const unsafeBundle: FederationExportBundle = {
      ...safeBundle,
      files: [{ path: '../outside.txt', content: 'nope' }],
    }

    try {
      await expect(
        writeFederationExportBundle({
          bundle: unsafeBundle,
          outputDir,
        })
      ).rejects.toThrow('Unsafe federation export file path')
    } finally {
      await rm(outputDir, { force: true, recursive: true })
    }
  })
})
