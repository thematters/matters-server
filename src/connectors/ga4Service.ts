import type {
  Article,
  ArticleVersion,
  Connections,
} from '#definitions/index.js'
import type { Knex } from 'knex'

import { environment } from '#common/environment.js'
import { BetaAnalyticsDataClient } from '@google-analytics/data'

export const TABLE_NAME = 'article_ga4_data'

interface Row {
  path: string
  totalUsers: string
}

interface MergedData {
  [key: string]: number
}

export const getLocalDateString = (date: Date) => {
  // return UTC+8 date string in YYYY-MM-DD format
  return date.toLocaleDateString('sv', { timeZone: 'Asia/Taipei' })
}

export class GA4Service {
  private knex: Knex
  private knexRO: Knex
  public constructor(connections: Connections) {
    this.knex = connections.knex
    this.knexRO = connections.knexRO
  }

  public fetchGA4Data = async ({
    startDate,
    endDate,
  }: {
    startDate: string
    endDate: string
  }): Promise<Row[]> => {
    const analyticsDataClient = new BetaAnalyticsDataClient({
      projectId: environment.ga4ProjectId,
      credentials: {
        client_email: environment.ga4ClientEmail,
        private_key: environment.ga4PrivateKey.replace(/\\n/g, '\n'),
      },
    })
    const limit = 10000
    let offset = 0
    const result: Row[] = []
    for (;;) {
      const res = await this.request(
        { startDate, endDate, limit, offset },
        analyticsDataClient
      )
      result.push(...res)
      offset += limit
      if (res.length < limit) {
        break
      }
    }
    return result
  }

  public saveGA4Data = async (
    data: MergedData,
    { startDate, endDate }: { startDate: string; endDate: string }
  ) => {
    const rows = Object.entries(data).map(([id, totalUsers]) => ({
      articleId: id,
      totalUsers,
      dateRange: `[${startDate}, ${endDate}]`,
    }))
    const updateRows = []
    const insertRows = []
    for (const { articleId, dateRange, totalUsers } of rows) {
      const res = await this.knexRO(TABLE_NAME)
        .where({ articleId, dateRange })
        .select('id', 'totalUsers')
        .first()
      if (res && res.totalUsers !== undefined) {
        if (res.totalUsers !== String(totalUsers)) {
          // only update when totalUsers is different
          updateRows.push({ id: res.id, totalUsers })
        }
      } else {
        insertRows.push({ articleId, dateRange, totalUsers })
      }
    }
    if (updateRows.length > 0) {
      for (const { id, totalUsers } of updateRows) {
        await this.knex(TABLE_NAME).update({ totalUsers }).where({ id: id })
      }
    }
    if (insertRows.length > 0) {
      await this.knex(TABLE_NAME).insert(insertRows)
    }
  }

  public convertAndMerge = async (rows: Row[]): Promise<MergedData> => {
    const converted = Promise.all(
      rows.map(async (row) => ({
        id: await this.pathToId(row.path),
        totalUsers: parseInt(row.totalUsers, 10),
      }))
    )
    const res: MergedData = {}
    const record = await this.knexRO<Article>('article').max('id').first()
    const maxLegalId = record ? parseInt(record.max, 10) : 0
    for (const row of await converted) {
      if (row.id in res) {
        res[row.id] += row.totalUsers
      } else {
        if (row.id && parseInt(row.id) <= maxLegalId) {
          res[row.id] = row.totalUsers
        }
      }
    }
    return res
  }

  public pathToId = async (path: string) => {
    if (path.startsWith('/@')) {
      const [, , articlePath] = path.split('/')
      if (articlePath) {
        const parts = articlePath.split('-')
        const idLike = parts[0]
        const hash = parts[parts.length - 1]
        if (/^-?\d+$/.test(idLike)) {
          return idLike
        } else {
          return this.mediaHashToId(hash)
        }
      }
    } else if (path.startsWith('/a/')) {
      const parts = path.split('/')
      if (parts.length === 3) {
        // /a/m4nxkbfhn4vc
        const shortHash = parts[2]
        return this.shortHashToId(shortHash)
      } else {
        // /a/m4nxkbfhn4vc/edit
        return null
      }
    }
    console.log('unexpected path', path)
    return null
  }

  private mediaHashToId = async (hash: string) => {
    const res = await this.knexRO<ArticleVersion>('article_version')
      .where({ mediaHash: hash })
      .select('article_id')
      .first()
    if (res) {
      return res.articleId
    } else {
      return null
    }
  }

  private shortHashToId = async (hash: string) => {
    const res = await this.knexRO<Article>('article')
      .where({ shortHash: hash })
      .select('id')
      .first()
    if (res) {
      return res.id
    } else {
      return null
    }
  }

  // https://developers.google.com/analytics/devguides/reporting/data/v1
  private request = async (
    {
      startDate,
      endDate,
      limit,
      offset,
    }: {
      startDate: string
      endDate: string
      limit: number
      offset: number
    },
    client: BetaAnalyticsDataClient
  ): Promise<Row[]> => {
    const [response] = await client.runReport({
      property: `properties/${environment.ga4PropertyId}`,
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      dimensions: [
        {
          name: 'pagePath',
        },
      ],
      dimensionFilter: {
        orGroup: {
          expressions: [
            {
              filter: {
                fieldName: 'pagePath',
                stringFilter: {
                  matchType: 'BEGINS_WITH',
                  value: '/a/',
                },
              },
            },
            {
              filter: {
                fieldName: 'pagePath',
                stringFilter: {
                  matchType: 'BEGINS_WITH',
                  value: '/@',
                },
              },
            },
          ],
        },
      },
      metrics: [
        {
          name: 'totalUsers',
          // name: 'activeUsers',
        },
      ],
      limit,
      offset,
      returnPropertyQuota: true,
    })
    if (response && response.rows) {
      console.log('quota used', response.propertyQuota)
      console.log('total rows count', response.rowCount)
      return response.rows.map((row) => ({
        path: (row.dimensionValues && row.dimensionValues[0].value) ?? '',
        totalUsers: (row.metricValues && row.metricValues[0].value) ?? '0',
      }))
    } else {
      throw new Error('No response received.')
    }
  }
}
