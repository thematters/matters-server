import type { Connections } from '#definitions/index.js'
import type { Knex } from 'knex'

export const TRANSPARENCY_SCHEMA_VERSION = '2026-06-20.1'

export type TransparencyDataStatus =
  | 'complete'
  | 'partial'
  | 'experimental'
  | 'not_recorded'

type CountMap = Record<string, number>

type NullableCountMap = CountMap | Record<string, never>

export interface TransparencyChangeLogEntry {
  date: string
  category: string
  summary: string
  public_url?: string
}

export interface TransparencyExternalMetricsInput {
  government_requests?: {
    total: number
    by_jurisdiction?: CountMap
    by_agency_type?: CountMap
    by_request_type?: CountMap
    by_data_type?: CountMap
    by_result?: CountMap
    by_user_notice?: CountMap
  }
  privacy_requests?: {
    total: number
    access?: number
    correction?: number
    deletion?: number
    restriction?: number
  }
  policy_changes?: TransparencyChangeLogEntry[]
  model_changes?: TransparencyChangeLogEntry[]
  recommendation_changes?: TransparencyChangeLogEntry[]
}

export interface GovernmentRequestMetrics {
  total: number | null
  by_jurisdiction: NullableCountMap
  by_agency_type: NullableCountMap
  by_request_type: NullableCountMap
  by_data_type: NullableCountMap
  by_result: NullableCountMap
  by_user_notice: NullableCountMap
  not_recorded: boolean
}

export interface PrivacyRequestMetrics {
  total: number | null
  access: number | null
  correction: number | null
  deletion: number | null
  restriction: number | null
  not_recorded: boolean
}

export interface TransparencyMetricsOptions {
  start: string
  end: string
  timezone?: 'Asia/Taipei' | 'UTC'
  generatedAt?: Date
  externalMetrics?: TransparencyExternalMetricsInput
}

export interface TransparencyMetrics {
  schema_version: typeof TRANSPARENCY_SCHEMA_VERSION
  reporting_period: {
    start: string
    end: string
    timezone: 'Asia/Taipei' | 'UTC'
  }
  data_status: {
    overall: 'partial'
    not_recorded_fields: string[]
    notes: string[]
  }
  moderation_cases: {
    total: number
    by_target_type: CountMap
    by_source: CountMap
    by_reason: CountMap
    by_status: CountMap
    by_outcome: CountMap
    by_automation_role: CountMap
    by_notice_state: CountMap
  }
  appeals: {
    total: number
    upheld: number
    reversed: number
    partially_reversed: number
    pending: number
    restored_content: number
  }
  handling_time: {
    average_hours: number | null
    median_hours: number | null
    p90_hours: number | null
    not_recorded: boolean
  }
  community_watch: {
    total_actions: number
    by_reason: CountMap
    appeals: number
    restored: number
    reviewed_by_staff: number
  }
  government_requests: GovernmentRequestMetrics
  privacy_requests: PrivacyRequestMetrics
  policy_changes: TransparencyChangeLogEntry[]
  model_changes: TransparencyChangeLogEntry[]
  recommendation_changes: TransparencyChangeLogEntry[]
  generated_at: string
}

interface Period {
  start: string
  end: string
  timezone: 'Asia/Taipei' | 'UTC'
  startDate: Date
  endExclusiveDate: Date
}

const timezoneOffset = {
  'Asia/Taipei': '+08:00',
  UTC: '+00:00',
} as const

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/

const assertDateOnly = (value: string, name: string) => {
  if (!dateOnlyPattern.test(value)) {
    throw new Error(`${name} must use YYYY-MM-DD format`)
  }
}

const addDays = (date: string, days: number) => {
  const next = new Date(`${date}T00:00:00.000Z`)
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}

const toPeriodDate = (
  date: string,
  timezone: keyof typeof timezoneOffset
): Date => new Date(`${date}T00:00:00.000${timezoneOffset[timezone]}`)

const formatGeneratedAt = (
  date: Date,
  timezone: keyof typeof timezoneOffset
): string => {
  const offset = timezoneOffset[timezone]
  const offsetHours = offset === '+08:00' ? 8 : 0
  const shifted = new Date(date.getTime() + offsetHours * 60 * 60 * 1000)
  return `${shifted.toISOString().slice(0, 19)}${offset}`
}

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'bigint') {
    return Number(value)
  }
  if (typeof value === 'string') {
    return Number.parseFloat(value)
  }
  return 0
}

const toRoundedHours = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null
  }
  const number = toNumber(value)
  if (Number.isNaN(number)) {
    return null
  }
  return Math.round(number * 100) / 100
}

const countRows = async (query: Knex.QueryBuilder): Promise<number> => {
  const row = (
    await query.count<Array<{ count: string | number }>>({
      count: '*',
    })
  )[0]
  return toNumber(row?.count)
}

const governmentRequestMapFields = [
  'by_jurisdiction',
  'by_agency_type',
  'by_request_type',
  'by_data_type',
  'by_result',
  'by_user_notice',
] as const

const privacyRequestCountFields = [
  'access',
  'correction',
  'deletion',
  'restriction',
] as const

const changeLogFields = [
  'policy_changes',
  'model_changes',
  'recommendation_changes',
] as const

type ChangeLogField = (typeof changeLogFields)[number]

const changeLogEntryFields = [
  'date',
  'category',
  'summary',
  'public_url',
] as const

const changeLogSourceGaps: Record<ChangeLogField, string> = {
  policy_changes: 'policy_change_source_not_structured',
  model_changes: 'model_change_source_not_structured',
  recommendation_changes: 'recommendation_change_source_not_structured',
}

const toRecord = (value: unknown, path: string): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${path} must be an object`)
  }
  return value as Record<string, unknown>
}

const assertAllowedKeys = (
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
  path: string
) => {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.includes(key)) {
      throw new Error(`${path}.${key} is not supported`)
    }
  }
}

const normalizeAggregateCount = (value: unknown, path: string): number => {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new Error(`${path} must be a non-negative integer`)
  }
  return value as number
}

const normalizeDateOnly = (value: unknown, path: string): string => {
  if (typeof value !== 'string') {
    throw new Error(`${path} must use YYYY-MM-DD format`)
  }
  assertDateOnly(value, path)
  return value
}

const normalizeBoundedString = (
  value: unknown,
  path: string,
  maxLength: number
): string => {
  if (typeof value !== 'string') {
    throw new Error(`${path} must be a string`)
  }
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > maxLength) {
    throw new Error(`${path} must be 1 to ${maxLength} characters`)
  }
  return trimmed
}

const normalizePublicUrl = (
  value: unknown,
  path: string
): string | undefined => {
  if (value === undefined) {
    return undefined
  }

  const url = normalizeBoundedString(value, path, 240)
  if (
    !url.startsWith('/') &&
    !url.startsWith('https://') &&
    !url.startsWith('http://')
  ) {
    throw new Error(
      `${path} must be a public http(s) URL or site-relative path`
    )
  }
  return url
}

const normalizeAggregateMap = (value: unknown, path: string): CountMap => {
  if (value === undefined) {
    return {}
  }

  const record = toRecord(value, path)
  return Object.entries(record).reduce<CountMap>((counts, [bucket, count]) => {
    if (!bucket || bucket.length > 80) {
      throw new Error(`${path} bucket names must be 1 to 80 characters`)
    }
    counts[bucket] = normalizeAggregateCount(count, `${path}.${bucket}`)
    return counts
  }, {})
}

export class TransparencyService {
  private readonly knexRO: Knex

  public constructor(connections: Connections) {
    this.knexRO = connections.knexRO
  }

  private normalizeExternalMetrics = (
    input?: TransparencyExternalMetricsInput
  ): {
    government_requests?: GovernmentRequestMetrics
    privacy_requests?: PrivacyRequestMetrics
    policy_changes?: TransparencyChangeLogEntry[]
    model_changes?: TransparencyChangeLogEntry[]
    recommendation_changes?: TransparencyChangeLogEntry[]
  } => {
    if (!input) {
      return {}
    }

    const record = toRecord(input, 'externalMetrics')
    assertAllowedKeys(
      record,
      ['government_requests', 'privacy_requests', ...changeLogFields],
      'externalMetrics'
    )

    return {
      government_requests: input.government_requests
        ? this.normalizeGovernmentRequestMetrics(input.government_requests)
        : undefined,
      privacy_requests: input.privacy_requests
        ? this.normalizePrivacyRequestMetrics(input.privacy_requests)
        : undefined,
      policy_changes: this.normalizeChangeLogMetrics(
        input.policy_changes,
        'externalMetrics.policy_changes'
      ),
      model_changes: this.normalizeChangeLogMetrics(
        input.model_changes,
        'externalMetrics.model_changes'
      ),
      recommendation_changes: this.normalizeChangeLogMetrics(
        input.recommendation_changes,
        'externalMetrics.recommendation_changes'
      ),
    }
  }

  private normalizeGovernmentRequestMetrics = (
    input: NonNullable<TransparencyExternalMetricsInput['government_requests']>
  ): GovernmentRequestMetrics => {
    const record = toRecord(input, 'externalMetrics.government_requests')
    assertAllowedKeys(
      record,
      ['total', ...governmentRequestMapFields],
      'externalMetrics.government_requests'
    )

    return {
      total: normalizeAggregateCount(
        input.total,
        'externalMetrics.government_requests.total'
      ),
      by_jurisdiction: normalizeAggregateMap(
        input.by_jurisdiction,
        'externalMetrics.government_requests.by_jurisdiction'
      ),
      by_agency_type: normalizeAggregateMap(
        input.by_agency_type,
        'externalMetrics.government_requests.by_agency_type'
      ),
      by_request_type: normalizeAggregateMap(
        input.by_request_type,
        'externalMetrics.government_requests.by_request_type'
      ),
      by_data_type: normalizeAggregateMap(
        input.by_data_type,
        'externalMetrics.government_requests.by_data_type'
      ),
      by_result: normalizeAggregateMap(
        input.by_result,
        'externalMetrics.government_requests.by_result'
      ),
      by_user_notice: normalizeAggregateMap(
        input.by_user_notice,
        'externalMetrics.government_requests.by_user_notice'
      ),
      not_recorded: false,
    }
  }

  private normalizePrivacyRequestMetrics = (
    input: NonNullable<TransparencyExternalMetricsInput['privacy_requests']>
  ): PrivacyRequestMetrics => {
    const record = toRecord(input, 'externalMetrics.privacy_requests')
    assertAllowedKeys(
      record,
      ['total', ...privacyRequestCountFields],
      'externalMetrics.privacy_requests'
    )

    return {
      total: normalizeAggregateCount(
        input.total,
        'externalMetrics.privacy_requests.total'
      ),
      access: normalizeAggregateCount(
        input.access ?? 0,
        'externalMetrics.privacy_requests.access'
      ),
      correction: normalizeAggregateCount(
        input.correction ?? 0,
        'externalMetrics.privacy_requests.correction'
      ),
      deletion: normalizeAggregateCount(
        input.deletion ?? 0,
        'externalMetrics.privacy_requests.deletion'
      ),
      restriction: normalizeAggregateCount(
        input.restriction ?? 0,
        'externalMetrics.privacy_requests.restriction'
      ),
      not_recorded: false,
    }
  }

  private normalizeChangeLogMetrics = (
    input: TransparencyChangeLogEntry[] | undefined,
    path: string
  ): TransparencyChangeLogEntry[] | undefined => {
    if (input === undefined) {
      return undefined
    }
    if (!Array.isArray(input)) {
      throw new Error(`${path} must be an array`)
    }

    return input.map((entry, index) => {
      const entryPath = `${path}[${index}]`
      const record = toRecord(entry, entryPath)
      assertAllowedKeys(record, changeLogEntryFields, entryPath)

      const publicUrl = normalizePublicUrl(
        record.public_url,
        `${entryPath}.public_url`
      )

      return {
        date: normalizeDateOnly(record.date, `${entryPath}.date`),
        category: normalizeBoundedString(
          record.category,
          `${entryPath}.category`,
          80
        ),
        summary: normalizeBoundedString(
          record.summary,
          `${entryPath}.summary`,
          500
        ),
        ...(publicUrl ? { public_url: publicUrl } : {}),
      }
    })
  }

  private getEmptyGovernmentRequests = (): GovernmentRequestMetrics => ({
    total: null,
    by_jurisdiction: {},
    by_agency_type: {},
    by_request_type: {},
    by_data_type: {},
    by_result: {},
    by_user_notice: {},
    not_recorded: true,
  })

  private getEmptyPrivacyRequests = (): PrivacyRequestMetrics => ({
    total: null,
    access: null,
    correction: null,
    deletion: null,
    restriction: null,
    not_recorded: true,
  })

  private getNotRecordedFields = (externalMetrics: {
    government_requests?: GovernmentRequestMetrics
    privacy_requests?: PrivacyRequestMetrics
    policy_changes?: TransparencyChangeLogEntry[]
    model_changes?: TransparencyChangeLogEntry[]
    recommendation_changes?: TransparencyChangeLogEntry[]
  }): string[] => [
    'legacy_reports_before_moderation_case_schema',
    ...(externalMetrics.government_requests
      ? []
      : ['government_request_log_source_not_configured']),
    ...(externalMetrics.privacy_requests
      ? []
      : ['privacy_request_source_not_structured']),
    ...(externalMetrics.policy_changes === undefined
      ? [changeLogSourceGaps.policy_changes]
      : []),
    ...(externalMetrics.model_changes === undefined
      ? [changeLogSourceGaps.model_changes]
      : []),
    ...(externalMetrics.recommendation_changes === undefined
      ? [changeLogSourceGaps.recommendation_changes]
      : []),
  ]

  private getDataStatusNotes = (externalMetrics: {
    government_requests?: GovernmentRequestMetrics
    privacy_requests?: PrivacyRequestMetrics
    policy_changes?: TransparencyChangeLogEntry[]
    model_changes?: TransparencyChangeLogEntry[]
    recommendation_changes?: TransparencyChangeLogEntry[]
  }): string[] => {
    const hasExternalRequestMetrics =
      externalMetrics.government_requests || externalMetrics.privacy_requests
    const hasExternalChangeLogs = changeLogFields.some(
      (field) => externalMetrics[field] !== undefined
    )

    return [
      'Fields marked not_recorded are data process gaps, not zero events.',
      'Only aggregated counts are exported; user ids, emails, IPs, original content, internal notes, and legal document contents are excluded.',
      ...(hasExternalRequestMetrics
        ? [
            'External request metrics were loaded from an aggregate-only private source.',
          ]
        : []),
      ...(hasExternalChangeLogs
        ? [
            'Policy, model, or recommendation change logs were loaded from a public-safe structured source.',
          ]
        : []),
    ]
  }

  public exportMetrics = async (
    options: TransparencyMetricsOptions
  ): Promise<TransparencyMetrics> => {
    const period = this.normalizePeriod(options)
    const externalMetrics = this.normalizeExternalMetrics(
      options.externalMetrics
    )
    const [moderationCases, appeals, handlingTime, communityWatch] =
      await Promise.all([
        this.getModerationCases(period),
        this.getAppeals(period),
        this.getHandlingTime(period),
        this.getCommunityWatch(period),
      ])

    return {
      schema_version: TRANSPARENCY_SCHEMA_VERSION,
      reporting_period: {
        start: period.start,
        end: period.end,
        timezone: period.timezone,
      },
      data_status: {
        overall: 'partial',
        not_recorded_fields: this.getNotRecordedFields(externalMetrics),
        notes: this.getDataStatusNotes(externalMetrics),
      },
      moderation_cases: moderationCases,
      appeals,
      handling_time: handlingTime,
      community_watch: communityWatch,
      government_requests:
        externalMetrics.government_requests ??
        this.getEmptyGovernmentRequests(),
      privacy_requests:
        externalMetrics.privacy_requests ?? this.getEmptyPrivacyRequests(),
      policy_changes: externalMetrics.policy_changes ?? [],
      model_changes: externalMetrics.model_changes ?? [],
      recommendation_changes: externalMetrics.recommendation_changes ?? [],
      generated_at: formatGeneratedAt(
        options.generatedAt ?? new Date(),
        period.timezone
      ),
    }
  }

  public toCsv = (metrics: TransparencyMetrics): string => {
    const rows: Array<Record<string, string | number | null>> = []
    const status = metrics.data_status.overall
    const push = ({
      metricGroup,
      metricName,
      bucket,
      count,
      dataStatus = status,
      note = '',
    }: {
      metricGroup: string
      metricName: string
      bucket: string
      count: number | null
      dataStatus?: TransparencyDataStatus
      note?: string
    }) => {
      rows.push({
        schema_version: metrics.schema_version,
        period_start: metrics.reporting_period.start,
        period_end: metrics.reporting_period.end,
        metric_group: metricGroup,
        metric_name: metricName,
        bucket,
        count,
        data_status: dataStatus,
        note,
      })
    }

    push({
      metricGroup: 'moderation_cases',
      metricName: 'total',
      bucket: 'all',
      count: metrics.moderation_cases.total,
    })
    this.pushMapRows(push, 'moderation_cases', metrics.moderation_cases)

    for (const key of [
      'total',
      'upheld',
      'reversed',
      'partially_reversed',
      'pending',
      'restored_content',
    ] as const) {
      push({
        metricGroup: 'appeals',
        metricName: key,
        bucket: 'all',
        count: metrics.appeals[key],
      })
    }

    for (const key of ['average_hours', 'median_hours', 'p90_hours'] as const) {
      push({
        metricGroup: 'handling_time',
        metricName: key,
        bucket: 'all',
        count: metrics.handling_time[key],
        dataStatus:
          metrics.handling_time[key] === null ? 'not_recorded' : status,
        note:
          metrics.handling_time[key] === null
            ? 'no resolved cases in period'
            : '',
      })
    }

    push({
      metricGroup: 'community_watch',
      metricName: 'total_actions',
      bucket: 'all',
      count: metrics.community_watch.total_actions,
    })
    for (const [bucket, count] of Object.entries(
      metrics.community_watch.by_reason
    )) {
      push({
        metricGroup: 'community_watch',
        metricName: 'by_reason',
        bucket,
        count,
      })
    }
    for (const key of ['appeals', 'restored', 'reviewed_by_staff'] as const) {
      push({
        metricGroup: 'community_watch',
        metricName: key,
        bucket: 'all',
        count: metrics.community_watch[key],
      })
    }

    if (metrics.government_requests.not_recorded) {
      for (const key of [
        'total',
        'by_jurisdiction',
        'by_agency_type',
        'by_request_type',
        'by_data_type',
        'by_result',
        'by_user_notice',
      ] as const) {
        push({
          metricGroup: 'government_requests',
          metricName: key,
          bucket: 'all',
          count: null,
          dataStatus: 'not_recorded',
          note: 'source log not configured',
        })
      }
    } else {
      push({
        metricGroup: 'government_requests',
        metricName: 'total',
        bucket: 'all',
        count: metrics.government_requests.total,
      })
      for (const metricName of governmentRequestMapFields) {
        this.pushCountMapRows(
          push,
          'government_requests',
          metricName,
          metrics.government_requests[metricName]
        )
      }
    }

    if (metrics.privacy_requests.not_recorded) {
      for (const key of [
        'total',
        'access',
        'correction',
        'deletion',
        'restriction',
      ] as const) {
        push({
          metricGroup: 'privacy_requests',
          metricName: key,
          bucket: 'all',
          count: null,
          dataStatus: 'not_recorded',
          note: 'structured source not configured',
        })
      }
    } else {
      for (const key of [
        'total',
        'access',
        'correction',
        'deletion',
        'restriction',
      ] as const) {
        push({
          metricGroup: 'privacy_requests',
          metricName: key,
          bucket: 'all',
          count: metrics.privacy_requests[key],
        })
      }
    }

    for (const metricGroup of changeLogFields) {
      this.pushChangeLogRows(
        push,
        metricGroup,
        metrics[metricGroup],
        metrics.data_status.not_recorded_fields.includes(
          changeLogSourceGaps[metricGroup]
        )
      )
    }

    const headers = [
      'schema_version',
      'period_start',
      'period_end',
      'metric_group',
      'metric_name',
      'bucket',
      'count',
      'data_status',
      'note',
    ] as const

    return [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((header) => this.escapeCsv(row[header])).join(',')
      ),
      '',
    ].join('\n')
  }

  private pushMapRows = (
    push: (row: {
      metricGroup: string
      metricName: string
      bucket: string
      count: number | null
      dataStatus?: TransparencyDataStatus
      note?: string
    }) => void,
    metricGroup: string,
    metrics: TransparencyMetrics['moderation_cases']
  ) => {
    for (const metricName of [
      'by_target_type',
      'by_source',
      'by_reason',
      'by_status',
      'by_outcome',
      'by_automation_role',
      'by_notice_state',
    ] as const) {
      for (const [bucket, count] of Object.entries(metrics[metricName])) {
        push({
          metricGroup,
          metricName,
          bucket,
          count,
        })
      }
    }
  }

  private pushChangeLogRows = (
    push: (row: {
      metricGroup: string
      metricName: string
      bucket: string
      count: number | null
      dataStatus?: TransparencyDataStatus
      note?: string
    }) => void,
    metricGroup: ChangeLogField,
    changes: TransparencyChangeLogEntry[],
    sourceNotRecorded: boolean
  ) => {
    if (sourceNotRecorded) {
      push({
        metricGroup,
        metricName: 'total',
        bucket: 'all',
        count: null,
        dataStatus: 'not_recorded',
        note: 'structured source not configured',
      })
      return
    }

    push({
      metricGroup,
      metricName: 'total',
      bucket: 'all',
      count: changes.length,
    })

    const byCategory = changes.reduce<CountMap>((counts, change) => {
      counts[change.category] = (counts[change.category] ?? 0) + 1
      return counts
    }, {})
    this.pushCountMapRows(push, metricGroup, 'by_category', byCategory)
  }

  private pushCountMapRows = (
    push: (row: {
      metricGroup: string
      metricName: string
      bucket: string
      count: number | null
      dataStatus?: TransparencyDataStatus
      note?: string
    }) => void,
    metricGroup: string,
    metricName: string,
    counts: NullableCountMap
  ) => {
    for (const [bucket, count] of Object.entries(counts)) {
      push({
        metricGroup,
        metricName,
        bucket,
        count,
      })
    }
  }

  private escapeCsv = (value: string | number | null): string => {
    if (value === null) {
      return ''
    }
    const stringValue = String(value)
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replaceAll('"', '""')}"`
    }
    return stringValue
  }

  private normalizePeriod = ({
    start,
    end,
    timezone = 'Asia/Taipei',
  }: TransparencyMetricsOptions): Period => {
    assertDateOnly(start, 'start')
    assertDateOnly(end, 'end')

    if (start > end) {
      throw new Error('start must be earlier than or equal to end')
    }

    return {
      start,
      end,
      timezone,
      startDate: toPeriodDate(start, timezone),
      endExclusiveDate: toPeriodDate(addDays(end, 1), timezone),
    }
  }

  private periodQuery = <TRecord extends Record<string, unknown>>(
    table: string,
    period: Period,
    dateColumn = 'createdAt'
  ): Knex.QueryBuilder<TRecord> =>
    this.knexRO<TRecord>(table)
      .where(dateColumn, '>=', period.startDate)
      .where(dateColumn, '<', period.endExclusiveDate)

  private countBy = async (
    table: string,
    column: string,
    period: Period,
    dateColumn = 'createdAt'
  ): Promise<CountMap> => {
    const rows = await this.periodQuery(table, period, dateColumn)
      .select(column)
      .count<Array<{ count: string | number }>>({ count: '*' })
      .groupBy(column)

    return rows.reduce<CountMap>((counts, row) => {
      const record = row as Record<string, unknown> & {
        count: string | number
      }
      const value = record[column] ?? 'unknown'
      counts[String(value)] = toNumber(record.count)
      return counts
    }, {})
  }

  private getModerationCases = async (
    period: Period
  ): Promise<TransparencyMetrics['moderation_cases']> => {
    const [
      total,
      byTargetType,
      bySource,
      byReason,
      byStatus,
      byOutcome,
      byAutomationRole,
      byNoticeState,
    ] = await Promise.all([
      countRows(this.periodQuery('moderation_case', period)),
      this.countBy('moderation_case', 'targetType', period),
      this.countBy('moderation_case', 'source', period),
      this.countBy('moderation_case', 'reason', period),
      this.countBy('moderation_case', 'status', period),
      this.countBy('moderation_case', 'outcome', period),
      this.countBy('moderation_case', 'automationRole', period),
      this.countBy('moderation_case', 'noticeState', period),
    ])

    return {
      total,
      by_target_type: byTargetType,
      by_source: bySource,
      by_reason: byReason,
      by_status: byStatus,
      by_outcome: byOutcome,
      by_automation_role: byAutomationRole,
      by_notice_state: byNoticeState,
    }
  }

  private getAppeals = async (
    period: Period
  ): Promise<TransparencyMetrics['appeals']> => {
    const [
      moderationAppeals,
      communityAppeals,
      upheldCases,
      upheldCommunityReviews,
      restoredCases,
      restoredCommunityEvents,
      partiallyRestoredCases,
      pendingModerationCases,
      pendingCommunityAppeals,
    ] = await Promise.all([
      countRows(
        this.periodQuery('moderation_event', period).where({
          eventType: 'appealed',
        })
      ),
      countRows(
        this.periodQuery('community_watch_review_event', period).where({
          eventType: 'appeal_received',
        })
      ),
      countRows(
        this.periodQuery('moderation_case', period).where({ outcome: 'upheld' })
      ),
      countRows(
        this.periodQuery('community_watch_review_event', period).where({
          eventType: 'review_upheld',
        })
      ),
      countRows(
        this.periodQuery('moderation_case', period).where({
          outcome: 'restored',
        })
      ),
      countRows(
        this.periodQuery('community_watch_review_event', period).where({
          eventType: 'comment_restored',
        })
      ),
      countRows(
        this.periodQuery('moderation_case', period).where({
          outcome: 'partially_restored',
        })
      ),
      countRows(
        this.periodQuery('moderation_case', period).where({
          status: 'appealed',
        })
      ),
      countRows(
        this.knexRO('community_watch_action')
          .where({ appealState: 'received' })
          .where('createdAt', '<', period.endExclusiveDate)
      ),
    ])

    return {
      total: moderationAppeals + communityAppeals,
      upheld: upheldCases + upheldCommunityReviews,
      reversed: restoredCases + restoredCommunityEvents,
      partially_reversed: partiallyRestoredCases,
      pending: pendingModerationCases + pendingCommunityAppeals,
      restored_content: restoredCases + restoredCommunityEvents,
    }
  }

  private getHandlingTime = async (
    period: Period
  ): Promise<TransparencyMetrics['handling_time']> => {
    const row = await this.periodQuery('moderation_case', period)
      .whereNotNull('resolvedAt')
      .select(
        this.knexRO.raw(
          'AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::float as "averageHours"'
        ),
        this.knexRO.raw(
          'PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::float as "medianHours"'
        ),
        this.knexRO.raw(
          'PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::float as "p90Hours"'
        )
      )
      .first()

    const averageHours = toRoundedHours(row?.averageHours)
    const medianHours = toRoundedHours(row?.medianHours)
    const p90Hours = toRoundedHours(row?.p90Hours)

    return {
      average_hours: averageHours,
      median_hours: medianHours,
      p90_hours: p90Hours,
      not_recorded: averageHours === null,
    }
  }

  private getCommunityWatch = async (
    period: Period
  ): Promise<TransparencyMetrics['community_watch']> => {
    const [totalActions, byReason, appeals, restored, reviewedByStaff] =
      await Promise.all([
        countRows(this.periodQuery('community_watch_action', period)),
        this.countBy('community_watch_action', 'reason', period),
        countRows(
          this.periodQuery('community_watch_review_event', period).where({
            eventType: 'appeal_received',
          })
        ),
        countRows(
          this.periodQuery('community_watch_review_event', period).where({
            eventType: 'comment_restored',
          })
        ),
        countRows(
          this.periodQuery(
            'community_watch_action',
            period,
            'reviewedAt'
          ).whereNotNull('reviewerId')
        ),
      ])

    return {
      total_actions: totalActions,
      by_reason: byReason,
      appeals,
      restored,
      reviewed_by_staff: reviewedByStaff,
    }
  }
}
