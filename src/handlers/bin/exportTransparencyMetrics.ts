import { TransparencyService } from '#connectors/transparencyService.js'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { connections } from '../../connections.js'

interface CliArgs {
  start?: string
  end?: string
  timezone?: 'Asia/Taipei' | 'UTC'
  outDir: string
  slug?: string
  externalMetrics?: string
}

const usage = `
Usage:
  npm run build
  npm run transparency:export -- --start=2026-01-01 --end=2026-06-30 --timezone=Asia/Taipei --out-dir=./tmp
  npm run transparency:export -- --start=2026-01-01 --end=2026-06-30 --external-metrics=./private/aggregate-transparency-metrics.json
`

const parseArgs = (argv: string[]): CliArgs => {
  const args: CliArgs = {
    outDir: './tmp/transparency-metrics',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) {
      continue
    }

    const [rawKey, inlineValue] = token.slice(2).split('=', 2)
    const value = inlineValue ?? argv[index + 1]
    if (!inlineValue) {
      index += 1
    }

    switch (rawKey) {
      case 'start':
        args.start = value
        break
      case 'end':
        args.end = value
        break
      case 'timezone':
        if (value !== 'Asia/Taipei' && value !== 'UTC') {
          throw new Error('timezone must be Asia/Taipei or UTC')
        }
        args.timezone = value
        break
      case 'out-dir':
        args.outDir = value
        break
      case 'slug':
        args.slug = value
        break
      case 'external-metrics':
        args.externalMetrics = value
        break
      default:
        throw new Error(`unknown argument: --${rawKey}`)
    }
  }

  if (!args.start || !args.end) {
    throw new Error('start and end are required')
  }

  return args
}

const shutdown = async () => {
  await Promise.allSettled([
    connections.knex.destroy(),
    connections.knexRO.destroy(),
    connections.knexSearch.destroy(),
  ])

  connections.redis.disconnect()
  if (connections.objectCacheRedis !== connections.redis) {
    connections.objectCacheRedis.disconnect()
  }
}

try {
  const args = parseArgs(process.argv.slice(2))
  const externalMetrics = args.externalMetrics
    ? JSON.parse(await readFile(path.resolve(args.externalMetrics), 'utf8'))
    : undefined
  const service = new TransparencyService(connections)
  const metrics = await service.exportMetrics({
    start: args.start as string,
    end: args.end as string,
    timezone: args.timezone ?? 'Asia/Taipei',
    externalMetrics,
  })
  const csv = service.toCsv(metrics)
  const slug = args.slug ?? `${args.start}_${args.end}`
  const jsonPath = path.resolve(
    args.outDir,
    `transparency-metrics-${slug}.json`
  )
  const csvPath = path.resolve(args.outDir, `transparency-metrics-${slug}.csv`)

  await mkdir(args.outDir, { recursive: true })
  await Promise.all([
    writeFile(jsonPath, `${JSON.stringify(metrics, null, 2)}\n`),
    writeFile(csvPath, csv),
  ])

  console.log(`wrote ${jsonPath}`)
  console.log(`wrote ${csvPath}`)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  console.error(usage.trim())
  process.exitCode = 1
} finally {
  await shutdown()
}
