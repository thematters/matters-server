import { Connections } from '#definitions/index.js'
import type { Knex } from 'knex'
import { ARTICLE_CHANNEL_JOB_STATE } from '#common/enums/index.js'
import { ChannelClassifier } from '#connectors/channel/channelClassifier.js'
import {
  ChannelJobService,
  type JobState,
} from '#connectors/channel/channelJobService.js'
import { jest } from '@jest/globals'

import { genConnections, closeConnections } from './utils.js'

let connections: Connections
let knex: Knex
let channelJobService: ChannelJobService

beforeAll(async () => {
  connections = await genConnections()
  knex = connections.knex
  channelJobService = new ChannelJobService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

// Create a mock implementation of ChannelClassifier
class MockChannelClassifier extends ChannelClassifier {
  constructor() {
    super('')
  }
  getJobResults = jest.fn<typeof ChannelClassifier.prototype.getJobResults>()
  classify = jest.fn<typeof ChannelClassifier.prototype.classify>()
  getJobResult = jest.fn<typeof ChannelClassifier.prototype.getJobResult>()
}

const createTestJob = async (
  articleId: string,
  jobId: string,
  state: JobState,
  createdAt?: Date
) => {
  return knex('article_channel_job').insert({
    article_id: articleId,
    job_id: jobId,
    state,
    created_at: createdAt || new Date(),
  })
}

const createTestChannel = async (providerId: string) => {
  return knex('topic_channel')
    .insert({
      provider_id: providerId,
      name: `Test Channel ${providerId}`,
      enabled: true,
      short_hash: providerId + 'hash',
    })
    .returning('*')
}

const mockClassifier = new MockChannelClassifier()

describe('db operations', () => {
  beforeEach(async () => {
    await knex('article_channel_job').delete()
  })

  describe('getRecentJobs', () => {
    it('should return only the latest job for each article within the specified days', async () => {
      // Setup test data
      const now = new Date()
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)

      // Create multiple jobs for the same article
      await createTestJob(
        '1',
        'job-1',
        ARTICLE_CHANNEL_JOB_STATE.finished,
        threeDaysAgo
      )
      await createTestJob(
        '1',
        'job-2',
        ARTICLE_CHANNEL_JOB_STATE.error,
        twoDaysAgo
      )
      await createTestJob(
        '1',
        'job-3',
        ARTICLE_CHANNEL_JOB_STATE.finished,
        oneDayAgo
      )

      // Create jobs for another article
      await createTestJob(
        '2',
        'job-4',
        ARTICLE_CHANNEL_JOB_STATE.finished,
        twoDaysAgo
      )
      await createTestJob(
        '2',
        'job-5',
        ARTICLE_CHANNEL_JOB_STATE.finished,
        oneDayAgo
      )

      // Execute
      const jobs = await channelJobService.getRecentJobs(48) // Get jobs from last 2 days

      // Verify
      expect(jobs).toHaveLength(2) // Should return one job per article
      expect(jobs.find((j) => j.articleId === '1')?.jobId).toBe('job-3') // Latest job for article 1
      expect(jobs.find((j) => j.articleId === '2')?.jobId).toBe('job-5') // Latest job for article 2
    })

    it('should not return jobs older than the specified days', async () => {
      // Setup test data
      const now = new Date()
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000)

      // Create jobs older than the specified days
      await createTestJob(
        '1',
        'job-1',
        ARTICLE_CHANNEL_JOB_STATE.processing,
        fourDaysAgo
      )
      await createTestJob(
        '2',
        'job-2',
        ARTICLE_CHANNEL_JOB_STATE.processing,
        threeDaysAgo
      )

      // Execute
      const jobs = await channelJobService.getRecentJobs(48) // Get jobs from last 2 days

      // Verify
      expect(jobs).toHaveLength(0) // Should not return any jobs
    })
  })

  describe('getProcessingJobs', () => {
    it('should return only the latest job for each article', async () => {
      // Setup test data
      const article1Id = '1'
      const article2Id = '2'
      const article3Id = '3'
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

      // Create multiple jobs for the same article
      await createTestJob(
        article1Id,
        'article1-job1',
        ARTICLE_CHANNEL_JOB_STATE.processing,
        twoHoursAgo
      )
      await createTestJob(
        article1Id,
        'article1-job2',
        ARTICLE_CHANNEL_JOB_STATE.processing,
        oneHourAgo
      )
      await createTestJob(
        article2Id,
        'article2-job1',
        ARTICLE_CHANNEL_JOB_STATE.processing,
        oneHourAgo
      )
      await createTestJob(
        article2Id,
        'article2-job2',
        ARTICLE_CHANNEL_JOB_STATE.finished,
        now
      )
      await createTestJob(
        article3Id,
        'article3-job1',
        ARTICLE_CHANNEL_JOB_STATE.processing,
        oneHourAgo
      )

      // Execute
      const jobs = await channelJobService.getProcessingJobs()

      // Verify
      expect(jobs).toHaveLength(2)
      expect(jobs[0].jobId).toBe('article1-job2') // Should return the most recent processing job
      expect(jobs[1].jobId).toBe('article3-job1') // Should return the most recent processing job
    })

    it('should return latest jobs for multiple articles', async () => {
      // Setup test data
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

      // Create jobs for multiple articles
      await createTestJob(
        '1',
        'job1',
        ARTICLE_CHANNEL_JOB_STATE.processing,
        oneHourAgo
      )
      await createTestJob(
        '1',
        'job2',
        ARTICLE_CHANNEL_JOB_STATE.processing,
        now
      )
      await createTestJob(
        '2',
        'job3',
        ARTICLE_CHANNEL_JOB_STATE.processing,
        oneHourAgo
      )
      await createTestJob(
        '2',
        'job4',
        ARTICLE_CHANNEL_JOB_STATE.processing,
        now
      )

      // Execute
      const jobs = await channelJobService.getProcessingJobs()

      // Verify
      expect(jobs).toHaveLength(2)
      expect(jobs.find((j) => j.articleId === '1')?.jobId).toBe('job2')
      expect(jobs.find((j) => j.articleId === '2')?.jobId).toBe('job4')
    })

    it('should not return non-processing jobs', async () => {
      // Setup test data
      await createTestJob('1', 'job1', ARTICLE_CHANNEL_JOB_STATE.finished)
      await createTestJob('2', 'job2', ARTICLE_CHANNEL_JOB_STATE.error)

      // Execute
      const jobs = await channelJobService.getProcessingJobs()

      // Verify
      expect(jobs).toHaveLength(0)
    })
  })
  describe('updateOrCreateProcessingJob', () => {
    it('should create a new job if it does not exist', async () => {
      const articleId = '1'
      await channelJobService.updateOrCreateProcessingJob(articleId, 'job1')
      const job = await knex('article_channel_job')
        .where('article_id', articleId)
        .first()
      expect(job).not.toBeNull()
      expect(job?.state).toBe(ARTICLE_CHANNEL_JOB_STATE.processing)
    })

    it('should update an existing job if it exists', async () => {
      const articleId = '2'
      await createTestJob(articleId, 'job1', ARTICLE_CHANNEL_JOB_STATE.error)
      await channelJobService.updateOrCreateProcessingJob(articleId, 'job1')
      const job = await knex('article_channel_job')
        .where('article_id', articleId)
        .first()
      expect(job).not.toBeNull()
      expect(job?.state).toBe(ARTICLE_CHANNEL_JOB_STATE.processing)
    })
  })
})

describe('sync-article-channels', () => {
  beforeEach(async () => {
    // Clear all relevant tables before each test
    await knex('article_channel_job').delete()
    await knex('topic_channel_article').delete()
    await knex('topic_channel').delete()
    jest.clearAllMocks()
  })

  describe('syncProcessingJobs', () => {
    it('should process jobs and update channel scores when results are available', async () => {
      // Setup test data
      const articleId = '1'
      await createTestJob(
        articleId,
        'classifierJob1',
        ARTICLE_CHANNEL_JOB_STATE.processing
      )
      await createTestChannel('channel1')
      await createTestChannel('channel2')

      // Setup mock results
      const mockResults = [
        {
          jobId: 'classifierJob1',
          state: ARTICLE_CHANNEL_JOB_STATE.finished,
          channels: [
            { channelId: 'channel1', score: 0.8 },
            { channelId: 'channel2', score: 0.6 },
          ],
        },
      ]

      mockClassifier.getJobResults.mockResolvedValue(mockResults)

      // Execute
      await channelJobService.syncProcessingJobs(mockClassifier)

      // Verify
      expect(mockClassifier.getJobResults).toHaveBeenCalledWith([
        'classifierJob1',
      ])

      // Check that channel scores were inserted
      const channelScores = await knex('topic_channel_article')
        .select('*')
        .where('article_id', articleId)
        .orderBy('channel_id', 'asc')
      expect(channelScores).toHaveLength(2)
      expect(channelScores[0].score).toBe(0.8)
      expect(channelScores[1].score).toBe(0.6)

      // Check that job state was updated
      const job = await knex('article_channel_job')
        .where('article_id', articleId)
        .first()
      expect(job.state).toBe(ARTICLE_CHANNEL_JOB_STATE.finished)
    })

    it('should automatically create new channels which are not in the database', async () => {
      // Setup test data
      const articleId = '1'
      await createTestJob(
        articleId,
        'classifierJob1',
        ARTICLE_CHANNEL_JOB_STATE.processing
      )

      // Setup mock results
      const mockResults = [
        {
          jobId: 'classifierJob1',
          state: ARTICLE_CHANNEL_JOB_STATE.finished,
          channels: [{ channelId: 'non-existent-channel', score: 0.8 }],
        },
      ]

      mockClassifier.getJobResults.mockResolvedValue(mockResults)

      // Execute
      await channelJobService.syncProcessingJobs(mockClassifier)

      // Verify
      const job = await knex('article_channel_job')
        .where('article_id', articleId)
        .first()
      expect(job.state).toBe(ARTICLE_CHANNEL_JOB_STATE.finished)

      const channels = await knex('topic_channel').select('*')
      expect(channels).toHaveLength(1)
      expect(channels[0].providerId).toBe('non-existent-channel')
      expect(channels[0].enabled).toBe(false)

      const channelScores = await knex('topic_channel_article')
        .select('*')
        .where('article_id', articleId)
      expect(channelScores).toHaveLength(1)
      expect(channelScores[0].score).toBe(0.8)
      expect(channelScores[0].enabled).toBe(true)
    })
  })

  describe('retryErrorJobs', () => {
    it('should retry article having error latest jobs and update their state', async () => {
      // Setup test data
      const articleId = '1'
      await createTestJob(
        articleId,
        'classifierJob1',
        ARTICLE_CHANNEL_JOB_STATE.error
      )

      // Setup mock results
      const mockResults = [
        {
          jobId: 'newJob1',
          state: ARTICLE_CHANNEL_JOB_STATE.processing,
        },
      ]

      mockClassifier.classify.mockResolvedValue(mockResults)

      // Execute
      await channelJobService.retryErrorJobs(mockClassifier)

      // Verify
      expect(mockClassifier.classify).toHaveBeenCalled()

      const jobs = await knex('article_channel_job')
        .select('*')
        .where('article_id', articleId)
        .orderBy('created_at', 'asc')
      expect(jobs).toHaveLength(2)
      expect(jobs[0].state).toBe(ARTICLE_CHANNEL_JOB_STATE.error)
      expect(jobs[1].state).toBe(ARTICLE_CHANNEL_JOB_STATE.processing)
    })

    it('should handle multiple error jobs for the same article', async () => {
      // Setup test data
      const articleId = '1'
      await createTestJob(
        articleId,
        'classifierJob1',
        ARTICLE_CHANNEL_JOB_STATE.error
      )
      await createTestJob(
        articleId,
        'classifierJob2',
        ARTICLE_CHANNEL_JOB_STATE.error
      )

      // Setup mock results
      const mockResults = [
        {
          jobId: 'newJob1',
          state: ARTICLE_CHANNEL_JOB_STATE.processing,
        },
      ]

      mockClassifier.classify.mockResolvedValue(mockResults)

      // Execute
      await channelJobService.retryErrorJobs(mockClassifier)

      // Verify
      const jobs = await knex('article_channel_job')
        .select('*')
        .where('article_id', articleId)
        .orderBy('created_at', 'asc')
      expect(jobs).toHaveLength(3)
      expect(jobs[0].state).toBe(ARTICLE_CHANNEL_JOB_STATE.error)
      expect(jobs[1].state).toBe(ARTICLE_CHANNEL_JOB_STATE.error)
      expect(jobs[2].state).toBe(ARTICLE_CHANNEL_JOB_STATE.processing)
    })
    it('should handle multiple error jobs for the same article', async () => {
      // Setup test data
      const articleId = '1'
      await createTestJob(
        articleId,
        'classifierJob1',
        ARTICLE_CHANNEL_JOB_STATE.error
      )
      await createTestJob(
        articleId,
        'classifierJob2',
        ARTICLE_CHANNEL_JOB_STATE.error
      )

      // Setup mock results
      const mockResults = [
        {
          jobId: 'classifierJob1',
          state: ARTICLE_CHANNEL_JOB_STATE.processing,
        },
      ]

      mockClassifier.classify.mockResolvedValue(mockResults)

      // Execute
      await channelJobService.retryErrorJobs(mockClassifier)

      // Verify
      const jobs = await knex('article_channel_job')
        .select('*')
        .where('article_id', articleId)
        .orderBy('created_at', 'asc')
      expect(jobs).toHaveLength(2)
      expect(jobs[0].state).toBe(ARTICLE_CHANNEL_JOB_STATE.processing)
      expect(jobs[1].state).toBe(ARTICLE_CHANNEL_JOB_STATE.error)
    })
  })
})

describe('insertChannelScores', () => {
  let articleId: string
  let channelId1: string
  let channelId2: string
  let channelId3: string
  beforeAll(async () => {
    await knex('topic_channel').delete()
    const channels = await knex('topic_channel')
      .insert([
        {
          name: 'Test Channel 1',
          provider_id: 'provider-1',
          short_hash: 'short-hash-1',
          enabled: true,
        },
        {
          name: 'Test Channel 2',
          provider_id: 'provider-2',
          short_hash: 'short-hash-2',
          enabled: true,
        },
        {
          name: 'Test Channel 3',
          provider_id: 'provider-3',
          short_hash: 'short-hash-3',
          enabled: true,
        },
      ])
      .returning('*')
    channelId1 = channels[0].id
    channelId2 = channels[1].id
    channelId3 = channels[2].id
  })
  beforeEach(async () => {
    articleId = '1'
    await knex('topic_channel_article').delete()
  })

  it('should insert new channel scores', async () => {
    // Execute
    await channelJobService.insertChannelScores(articleId, [
      {
        channel_id: channelId1,
        score: 0.8,
      },
    ])

    // Verify score was inserted
    const channelScores = await knex('topic_channel_article').where({
      article_id: articleId,
    })
    expect(channelScores).toHaveLength(1)
    expect(channelScores[0].score).toBe(0.8)
    expect(channelScores[0].enabled).toBe(true)
  })

  it('should insert new channel scores and delete unlabeled channels', async () => {
    // Setup test data
    await knex('topic_channel_article').insert([
      {
        article_id: articleId,
        channel_id: channelId1,
        score: 0.5,
        is_labeled: false,
        enabled: true,
      },
      {
        article_id: articleId,
        channel_id: channelId2,
        score: 0.5,
        is_labeled: true,
        enabled: true,
      },
    ])

    // Execute
    await channelJobService.insertChannelScores(articleId, [
      {
        channel_id: channelId3,
        score: 0.8,
      },
    ])

    // Verify score was inserted
    const channelScores = await knex('topic_channel_article')
      .select('*')
      .where({
        article_id: articleId,
      })
      .orderBy('channel_id', 'asc')
    expect(channelScores).toHaveLength(2)
    expect(channelScores[0].channelId).toBe(channelId2)
    expect(channelScores[0].score).toBe(0.5)
    expect(channelScores[0].isLabeled).toBe(true)
    expect(channelScores[1].channelId).toBe(channelId3)
    expect(channelScores[1].score).toBe(0.8)
    expect(channelScores[1].isLabeled).toBe(false)
  })

  it('should update existing channel scores no matter if they are labeled', async () => {
    // Create initial score
    await knex('topic_channel_article').insert([
      {
        article_id: articleId,
        channel_id: channelId1,
        score: 0.5,
        enabled: true,
        is_labeled: false,
      },
      {
        article_id: articleId,
        channel_id: channelId2,
        score: 0.5,
        enabled: false,
        is_labeled: true,
      },
    ])

    // Execute
    await channelJobService.insertChannelScores(articleId, [
      {
        channel_id: channelId1,
        score: 0.9,
      },
      {
        channel_id: channelId2,
        score: 0.9,
      },
    ])

    // Verify score was updated
    const channelScores = await knex('topic_channel_article')
      .select('*')
      .where({
        article_id: articleId,
      })
      .orderBy('channel_id', 'asc')
    expect(channelScores[0].score).toBe(0.9)
    expect(channelScores[0].enabled).toBe(true)
    expect(channelScores[0].isLabeled).toBe(false)
    expect(channelScores[1].score).toBe(0.9)
    expect(channelScores[1].enabled).toBe(false)
    expect(channelScores[1].isLabeled).toBe(true)
  })

  it('should handle empty channel scores array without error', async () => {
    // First insert some unlabeled scores
    await knex('topic_channel_article').insert({
      article_id: articleId,
      channel_id: channelId1,
      score: 0.5,
      is_labeled: false,
      enabled: true,
    })

    // Execute with empty array
    await channelJobService.insertChannelScores(articleId, [])

    // Should have deleted unlabeled scores
    const channelScores = await knex('topic_channel_article').where({
      article_id: articleId,
    })
    expect(channelScores).toHaveLength(0)
  })

  it('should insert multiple channel scores in a single operation', async () => {
    const scores = [
      { channel_id: channelId1, score: 0.8 },
      { channel_id: channelId2, score: 0.6 },
      { channel_id: channelId3, score: 0.4 },
    ]

    await channelJobService.insertChannelScores(articleId, scores)

    const channelScores = await knex('topic_channel_article')
      .where({ article_id: articleId })
      .orderBy('score', 'desc')

    expect(channelScores).toHaveLength(3)
    expect(channelScores[0].score).toBe(0.8)
    expect(channelScores[1].score).toBe(0.6)
    expect(channelScores[2].score).toBe(0.4)
  })

  it('should update updated_at timestamp when updating existing scores', async () => {
    // Insert initial score
    await knex('topic_channel_article').insert({
      article_id: articleId,
      channel_id: channelId1,
      score: 0.5,
      enabled: true,
      is_labeled: false,
      updated_at: new Date('2023-01-01'),
    })

    const beforeUpdate = await knex('topic_channel_article')
      .where({ article_id: articleId, channel_id: channelId1 })
      .first()

    // Update the score
    await channelJobService.insertChannelScores(articleId, [
      {
        channel_id: channelId1,
        score: 0.9,
      },
    ])

    const afterUpdate = await knex('topic_channel_article')
      .where({ article_id: articleId, channel_id: channelId1 })
      .first()

    expect(afterUpdate.score).toBe(0.9)
    expect(afterUpdate.updatedAt.getTime()).toBeGreaterThan(
      beforeUpdate.updatedAt.getTime()
    )
  })

  it('should throw error when trying to insert invalid channel ID', async () => {
    const invalidChannelId = '99999'

    await expect(
      channelJobService.insertChannelScores(articleId, [
        {
          channel_id: invalidChannelId,
          score: 0.8,
        },
      ])
    ).rejects.toThrow() // Should throw due to foreign key constraint
  })
})
