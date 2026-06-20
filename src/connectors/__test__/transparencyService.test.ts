import type { Connections } from '#definitions/index.js'

import { v4 } from 'uuid'

import { TransparencyService } from '../transparencyService.js'

import { closeConnections, genConnections } from './utils.js'

let connections: Connections
let service: TransparencyService

beforeAll(async () => {
  connections = await genConnections()
  service = new TransparencyService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

beforeEach(async () => {
  await connections.knex('moderation_event').del()
  await connections.knex('moderation_case_reporter').del()
  await connections.knex('moderation_case').del()
  await connections.knex('community_watch_review_event').del()
  await connections.knex('community_watch_action').del()
})

test('exports aggregated transparency metrics without sensitive fields', async () => {
  const [collapsedCase, hiddenCase, receivedCase] = await connections
    .knex('moderation_case')
    .insert([
      {
        source: 'direct_report',
        targetType: 'comment',
        targetId: '1',
        primaryReporterId: '1',
        reason: 'other',
        publicReason: 'public reason',
        status: 'action_taken',
        outcome: 'content_collapsed',
        automationRole: 'none',
        noticeState: 'sent',
        resolvedAt: new Date('2026-01-10T12:00:00.000+08:00'),
        createdAt: new Date('2026-01-10T00:00:00.000+08:00'),
        updatedAt: new Date('2026-01-10T12:00:00.000+08:00'),
      },
      {
        source: 'automated',
        targetType: 'article',
        targetId: '1',
        primaryReporterId: null,
        reason: 'spam',
        status: 'action_taken',
        outcome: 'content_hidden',
        automationRole: 'automated',
        noticeState: 'not_required',
        resolvedAt: new Date('2026-02-01T12:00:00.000+08:00'),
        createdAt: new Date('2026-02-01T00:00:00.000+08:00'),
        updatedAt: new Date('2026-02-01T12:00:00.000+08:00'),
      },
      {
        source: 'direct_report',
        targetType: 'moment',
        targetId: '1',
        primaryReporterId: '2',
        reason: 'other',
        status: 'received',
        outcome: null,
        automationRole: 'none',
        noticeState: 'not_required',
        createdAt: new Date('2026-03-01T00:00:00.000+08:00'),
        updatedAt: new Date('2026-03-01T00:00:00.000+08:00'),
      },
    ])
    .returning('*')

  await connections.knex('moderation_event').insert([
    {
      caseId: collapsedCase.id,
      eventType: 'created',
      actorType: 'user',
      actorId: '1',
      toStatus: 'received',
      internalNote: 'private moderation note',
      metadata: { userId: '1', reportId: '1' },
      createdAt: new Date('2026-01-10T00:00:00.000+08:00'),
    },
    {
      caseId: collapsedCase.id,
      eventType: 'appealed',
      actorType: 'user',
      actorId: '1',
      fromStatus: 'action_taken',
      toStatus: 'appealed',
      internalNote: 'appeal private note',
      createdAt: new Date('2026-01-11T00:00:00.000+08:00'),
    },
    {
      caseId: hiddenCase.id,
      eventType: 'actioned',
      actorType: 'model',
      fromStatus: 'reviewing',
      toStatus: 'action_taken',
      toOutcome: 'content_hidden',
      createdAt: new Date('2026-02-01T12:00:00.000+08:00'),
    },
  ])

  const [communityWatchAction] = await connections
    .knex('community_watch_action')
    .insert({
      uuid: v4(),
      commentId: '1',
      commentType: 'article',
      targetType: 'article',
      targetId: '1',
      targetTitle: 'Sensitive title should not export',
      targetShortHash: 'abc123',
      reason: 'spam_ad',
      actorId: '1',
      commentAuthorId: '2',
      originalContent: 'original comment content should not export',
      originalState: 'active',
      actionState: 'restored',
      appealState: 'received',
      reviewState: 'reversed',
      reviewerId: '1',
      reviewNote: 'community review note',
      reviewedAt: new Date('2026-01-12T00:00:00.000+08:00'),
      contentExpiresAt: new Date('2026-04-12T00:00:00.000+08:00'),
      createdAt: new Date('2026-01-10T00:00:00.000+08:00'),
      updatedAt: new Date('2026-01-12T00:00:00.000+08:00'),
    })
    .returning('*')

  await connections.knex('community_watch_review_event').insert([
    {
      uuid: v4(),
      actionId: communityWatchAction.id,
      eventType: 'appeal_received',
      actorId: '2',
      note: 'community appeal note',
      createdAt: new Date('2026-01-11T00:00:00.000+08:00'),
    },
    {
      uuid: v4(),
      actionId: communityWatchAction.id,
      eventType: 'comment_restored',
      actorId: '1',
      note: 'community restore note',
      createdAt: new Date('2026-01-12T00:00:00.000+08:00'),
    },
  ])

  const metrics = await service.exportMetrics({
    start: '2026-01-01',
    end: '2026-06-30',
    timezone: 'Asia/Taipei',
    generatedAt: new Date('2026-07-01T00:00:00.000+08:00'),
  })

  expect(metrics.moderation_cases.total).toBe(3)
  expect(metrics.moderation_cases.by_target_type).toEqual({
    article: 1,
    comment: 1,
    moment: 1,
  })
  expect(metrics.moderation_cases.by_source).toEqual({
    automated: 1,
    direct_report: 2,
  })
  expect(metrics.moderation_cases.by_outcome).toEqual({
    content_collapsed: 1,
    content_hidden: 1,
    unknown: 1,
  })
  expect(metrics.moderation_cases.by_automation_role).toEqual({
    automated: 1,
    none: 2,
  })
  expect(metrics.appeals).toEqual({
    total: 2,
    upheld: 0,
    reversed: 1,
    partially_reversed: 0,
    pending: 1,
    restored_content: 1,
  })
  expect(metrics.handling_time).toEqual({
    average_hours: 12,
    median_hours: 12,
    p90_hours: 12,
    not_recorded: false,
  })
  expect(metrics.community_watch).toEqual({
    total_actions: 1,
    by_reason: { spam_ad: 1 },
    appeals: 1,
    restored: 1,
    reviewed_by_staff: 1,
  })
  expect(metrics.government_requests.total).toBeNull()
  expect(metrics.privacy_requests.not_recorded).toBe(true)

  const exported = JSON.stringify(metrics)
  expect(exported).not.toContain('private moderation note')
  expect(exported).not.toContain('original comment content')
  expect(exported).not.toContain('community review note')
  expect(exported).not.toContain('community appeal note')
  expect(exported).not.toContain('actorId')
  expect(exported).not.toContain('primaryReporterId')
  expect(exported).not.toContain('reportId')
  expect(exported).not.toContain('userId')
  expect(exported).not.toContain('Sensitive title')
  expect(receivedCase.id).toBeDefined()
})

test('serializes stable CSV rows with not recorded gaps', async () => {
  const metrics = await service.exportMetrics({
    start: '2026-01-01',
    end: '2026-06-30',
    timezone: 'Asia/Taipei',
    generatedAt: new Date('2026-07-01T00:00:00.000+08:00'),
  })
  const csv = service.toCsv(metrics)

  expect(csv.split('\n')[0]).toBe(
    'schema_version,period_start,period_end,metric_group,metric_name,bucket,count,data_status,note'
  )
  expect(csv).toContain(
    '2026-06-20.1,2026-01-01,2026-06-30,moderation_cases,total,all,0,partial,'
  )
  expect(csv).toContain(
    '2026-06-20.1,2026-01-01,2026-06-30,government_requests,total,all,,not_recorded,source log not configured'
  )
  expect(csv).toContain(
    '2026-06-20.1,2026-01-01,2026-06-30,handling_time,average_hours,all,,not_recorded,no resolved cases in period'
  )
  expect(csv).toContain(
    '2026-06-20.1,2026-01-01,2026-06-30,policy_changes,total,all,,not_recorded,structured source not configured'
  )
})

test('loads optional external aggregate and structured change metrics', async () => {
  const metrics = await service.exportMetrics({
    start: '2026-01-01',
    end: '2026-06-30',
    timezone: 'Asia/Taipei',
    generatedAt: new Date('2026-07-01T00:00:00.000+08:00'),
    externalMetrics: {
      government_requests: {
        total: 2,
        by_jurisdiction: { TW: 2 },
        by_agency_type: { court: 1, law_enforcement: 1 },
        by_request_type: { data_request: 1, content_restriction: 1 },
        by_data_type: { account_information: 1, content: 1 },
        by_result: { rejected: 1, partially_complied: 1 },
        by_user_notice: { notified: 1, prohibited: 1 },
      },
      privacy_requests: {
        total: 3,
        access: 1,
        deletion: 2,
      },
      policy_changes: [
        {
          date: '2026-03-01',
          category: 'content_rules',
          summary: 'Updated public content handling rules for spam reports.',
          public_url: '/transparency/automation',
        },
      ],
      model_changes: [
        {
          date: '2026-04-15',
          category: 'spam_detection',
          summary: 'Moved comment spam classifier to review-only monitoring.',
        },
      ],
      recommendation_changes: [],
    },
  })

  expect(metrics.government_requests).toEqual({
    total: 2,
    by_jurisdiction: { TW: 2 },
    by_agency_type: { court: 1, law_enforcement: 1 },
    by_request_type: { data_request: 1, content_restriction: 1 },
    by_data_type: { account_information: 1, content: 1 },
    by_result: { rejected: 1, partially_complied: 1 },
    by_user_notice: { notified: 1, prohibited: 1 },
    not_recorded: false,
  })
  expect(metrics.privacy_requests).toEqual({
    total: 3,
    access: 1,
    correction: 0,
    deletion: 2,
    restriction: 0,
    not_recorded: false,
  })
  expect(metrics.data_status.not_recorded_fields).not.toContain(
    'government_request_log_source_not_configured'
  )
  expect(metrics.data_status.not_recorded_fields).not.toContain(
    'privacy_request_source_not_structured'
  )
  expect(metrics.data_status.not_recorded_fields).not.toContain(
    'policy_change_source_not_structured'
  )
  expect(metrics.data_status.not_recorded_fields).not.toContain(
    'model_change_source_not_structured'
  )
  expect(metrics.data_status.not_recorded_fields).not.toContain(
    'recommendation_change_source_not_structured'
  )
  expect(metrics.policy_changes).toEqual([
    {
      date: '2026-03-01',
      category: 'content_rules',
      summary: 'Updated public content handling rules for spam reports.',
      public_url: '/transparency/automation',
    },
  ])
  expect(metrics.model_changes).toEqual([
    {
      date: '2026-04-15',
      category: 'spam_detection',
      summary: 'Moved comment spam classifier to review-only monitoring.',
    },
  ])
  expect(metrics.recommendation_changes).toEqual([])

  const csv = service.toCsv(metrics)
  expect(csv).toContain(
    '2026-06-20.1,2026-01-01,2026-06-30,government_requests,total,all,2,partial,'
  )
  expect(csv).toContain(
    '2026-06-20.1,2026-01-01,2026-06-30,government_requests,by_result,rejected,1,partial,'
  )
  expect(csv).toContain(
    '2026-06-20.1,2026-01-01,2026-06-30,privacy_requests,deletion,all,2,partial,'
  )
  expect(csv).toContain(
    '2026-06-20.1,2026-01-01,2026-06-30,policy_changes,total,all,1,partial,'
  )
  expect(csv).toContain(
    '2026-06-20.1,2026-01-01,2026-06-30,model_changes,by_category,spam_detection,1,partial,'
  )
  expect(csv).toContain(
    '2026-06-20.1,2026-01-01,2026-06-30,recommendation_changes,total,all,0,partial,'
  )
})

test('rejects external metrics with unknown or unsafe fields', async () => {
  await expect(
    service.exportMetrics({
      start: '2026-01-01',
      end: '2026-06-30',
      externalMetrics: {
        government_requests: {
          total: 1,
          records: [{ email: 'private@example.com' }],
        },
      } as any,
    })
  ).rejects.toThrow(
    'externalMetrics.government_requests.records is not supported'
  )

  await expect(
    service.exportMetrics({
      start: '2026-01-01',
      end: '2026-06-30',
      externalMetrics: {
        privacy_requests: {
          total: -1,
        },
      },
    })
  ).rejects.toThrow(
    'externalMetrics.privacy_requests.total must be a non-negative integer'
  )

  await expect(
    service.exportMetrics({
      start: '2026-01-01',
      end: '2026-06-30',
      externalMetrics: {
        policy_changes: [
          {
            date: '2026-1-1',
            category: 'content_rules',
            summary: 'Invalid date format.',
          },
        ],
      },
    })
  ).rejects.toThrow(
    'externalMetrics.policy_changes[0].date must use YYYY-MM-DD format'
  )

  await expect(
    service.exportMetrics({
      start: '2026-01-01',
      end: '2026-06-30',
      externalMetrics: {
        model_changes: [
          {
            date: '2026-01-01',
            category: 'spam_detection',
            summary: 'Unsafe URL.',
            public_url: 'javascript:alert(1)',
          },
        ],
      },
    })
  ).rejects.toThrow(
    'externalMetrics.model_changes[0].public_url must be a public http(s) URL or site-relative path'
  )
})
