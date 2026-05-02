import type { Connections } from '#definitions/index.js'
import type {
  FederationExportBundleInput,
  FederationExportArticleRow,
} from './federationExportService.js'

import { readFile } from 'node:fs/promises'

import {
  buildFederationExportBundle,
  FederationExportService,
  writeFederationExportBundle,
} from './federationExportService.js'

type CliOptions = {
  articleIds: string[]
  input?: string
  outputDir?: string
  siteDomain: string
  webfDomain?: string
  generatedAt?: string
}

const usage = `Usage:
  npm run federation:export -- --input ./fixture.json --output-dir ./tmp/federation --webf-domain staging-gateway.example
  npm run federation:export -- --article-id 123 --article-id 456 --output-dir ./tmp/federation --webf-domain staging-gateway.example

Options:
  --input PATH          JSON input with rows, siteDomain, webfDomain, generatedAt
  --article-id ID       Explicit article ID to load through the read-only DB connection; repeatable or comma-separated
  --output-dir PATH     Local output directory for generated files
  --site-domain HOST    Source Matters site domain; default MATTERS_SITE_DOMAIN or matters.town
  --webf-domain HOST    ActivityPub WebFinger domain; default MATTERS_FEDERATION_WEBF_DOMAIN
  --generated-at ISO    Optional deterministic timestamp for generated output
`

const maskSecretText = (value: string) =>
  value
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/g, 'postgresql://***@')
    .replace(/password=[^&\s]+/g, 'password=***')

const readOptionValue = ({
  args,
  index,
  option,
}: {
  args: string[]
  index: number
  option: string
}) => {
  const value = args[index + 1]
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value`)
  }
  return value
}

export const parseFederationExportCliArgs = (args: string[]): CliOptions => {
  const options: CliOptions = {
    articleIds: [],
    siteDomain: process.env.MATTERS_SITE_DOMAIN || 'matters.town',
    webfDomain: process.env.MATTERS_FEDERATION_WEBF_DOMAIN,
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--help' || arg === '-h') {
      console.log(usage)
      process.exit(0)
    }

    if (arg === '--article-id') {
      const value = readOptionValue({ args, index: i, option: arg })
      options.articleIds.push(
        ...value
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      )
      i += 1
    } else if (arg === '--input') {
      options.input = readOptionValue({ args, index: i, option: arg })
      i += 1
    } else if (arg === '--output-dir') {
      options.outputDir = readOptionValue({ args, index: i, option: arg })
      i += 1
    } else if (arg === '--site-domain') {
      options.siteDomain = readOptionValue({ args, index: i, option: arg })
      i += 1
    } else if (arg === '--webf-domain') {
      options.webfDomain = readOptionValue({ args, index: i, option: arg })
      i += 1
    } else if (arg === '--generated-at') {
      options.generatedAt = readOptionValue({ args, index: i, option: arg })
      i += 1
    } else {
      throw new Error(`Unknown option: ${arg}`)
    }
  }

  if (!options.outputDir) {
    throw new Error('--output-dir is required')
  }
  if (!options.webfDomain) {
    throw new Error(
      '--webf-domain or MATTERS_FEDERATION_WEBF_DOMAIN is required'
    )
  }
  if (options.input && options.articleIds.length > 0) {
    throw new Error('--input and --article-id cannot be used together')
  }
  if (!options.input && options.articleIds.length === 0) {
    throw new Error('Provide --input or at least one --article-id')
  }

  return options
}

const loadFixtureInput = async (
  options: CliOptions
): Promise<FederationExportBundleInput> => {
  if (!options.input) {
    throw new Error('Fixture input path is required')
  }

  const parsed = JSON.parse(
    await readFile(options.input, 'utf8')
  ) as Partial<FederationExportBundleInput>
  if (!Array.isArray(parsed.rows)) {
    throw new Error('Fixture input must contain rows')
  }

  return {
    rows: parsed.rows as FederationExportArticleRow[],
    siteDomain: parsed.siteDomain || options.siteDomain,
    webfDomain: parsed.webfDomain || options.webfDomain!,
    generatedAt: parsed.generatedAt || options.generatedAt,
    actor: parsed.actor,
  }
}

const loadDbInput = async (
  options: CliOptions
): Promise<{
  input: FederationExportBundleInput
  close: () => Promise<void>
}> => {
  const { connections } = (await import('../../connections.js')) as {
    connections: Connections
  }
  const service = new FederationExportService(connections)
  const rows = await service.loadSelectedArticleRows(options.articleIds)

  return {
    input: {
      rows,
      siteDomain: options.siteDomain,
      webfDomain: options.webfDomain!,
      generatedAt: options.generatedAt,
    },
    close: async () => {
      await Promise.all([
        connections.knex.destroy(),
        connections.knexRO.destroy(),
        connections.knexSearch.destroy(),
      ])
      connections.redis.disconnect()
      if (connections.objectCacheRedis !== connections.redis) {
        connections.objectCacheRedis.disconnect()
      }
    },
  }
}

export const runFederationExportCli = async (args: string[]) => {
  const options = parseFederationExportCliArgs(args)
  const dbInput = options.input ? undefined : await loadDbInput(options)

  try {
    const input = options.input
      ? await loadFixtureInput(options)
      : dbInput!.input
    const bundle = buildFederationExportBundle(input)
    const files = await writeFederationExportBundle({
      bundle,
      outputDir: options.outputDir!,
    })

    console.log(
      JSON.stringify(
        {
          outputDir: options.outputDir,
          files,
          actor: bundle.manifest.actor,
          articleCount: bundle.manifest.articles.length,
        },
        null,
        2
      )
    )
  } finally {
    await dbInput?.close()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runFederationExportCli(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(maskSecretText(message))
    console.error(usage)
    process.exit(1)
  })
}
