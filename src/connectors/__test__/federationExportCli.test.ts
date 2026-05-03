import {
  ARTICLE_ACCESS_TYPE,
  ARTICLE_STATE,
  USER_STATE,
} from '#common/enums/index.js'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { jest } from '@jest/globals'
import {
  FEDERATION_ARTICLE_SETTING,
  FEDERATION_AUTHOR_SETTING,
  FederationExportArticleRow,
} from '#connectors/article/federationExportService.js'
import {
  parseFederationExportCliArgs,
  runFederationExportCli,
} from '#connectors/article/federationExportCli.js'

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

describe('federationExportCli', () => {
  test('parses strict gate flag without relying on environment state', () => {
    const options = parseFederationExportCliArgs([
      '--input',
      './fixture.json',
      '--output-dir',
      './out',
      '--webf-domain',
      'staging-gateway.matters.town',
      '--enforce-federation-gate',
    ])

    expect(options.enforceFederationGate).toBe(true)
    expect(options.input).toBe('./fixture.json')
    expect(options.outputDir).toBe('./out')
  })

  test('writes fixture export and prints decision report', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'matters-federation-cli-'))
    const inputPath = path.join(root, 'fixture.json')
    const outputDir = path.join(root, 'out')
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

    try {
      await writeFile(
        inputPath,
        JSON.stringify({
          rows: [
            publicRow({
              author: {
                ...publicRow().author,
                federationSetting: FEDERATION_AUTHOR_SETTING.enabled,
              },
            }),
            publicRow({
              articleId: '102',
              federationSetting: FEDERATION_ARTICLE_SETTING.disabled,
              author: {
                ...publicRow().author,
                federationSetting: FEDERATION_AUTHOR_SETTING.enabled,
              },
            }),
          ],
          siteDomain: 'matters.town',
          webfDomain: 'staging-gateway.matters.town',
        }),
        'utf8'
      )

      await runFederationExportCli([
        '--input',
        inputPath,
        '--output-dir',
        outputDir,
        '--webf-domain',
        'staging-gateway.matters.town',
        '--enforce-federation-gate',
      ])
      const output = JSON.parse(logSpy.mock.calls[0][0] as string)
      const manifest = JSON.parse(
        await readFile(
          path.join(outputDir, 'activitypub-manifest.json'),
          'utf8'
        )
      )

      expect(output.articleCount).toBe(1)
      expect(output.decisionReport).toMatchObject({
        enforceFederationGate: true,
        selected: 2,
        eligible: 1,
        skipped: 1,
      })
      expect(output.decisionReport.decisions[1].reason).toBe('article_disabled')
      expect(manifest.articles).toHaveLength(1)
    } finally {
      logSpy.mockRestore()
      await rm(root, { force: true, recursive: true })
    }
  })
})
