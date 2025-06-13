import type { Connections, ArticleChannelJob } from '#definitions/index.js'
import type { Knex } from 'knex'

import { ARTICLE_CHANNEL_JOB_STATE } from '#common/enums/index.js'
import { getLogger } from '#common/logger.js'

import { ChannelClassifier } from './channelClassifier.js'
import { ChannelService } from './channelService.js'

const logger = getLogger('service-channel-job')

export type JobState =
  (typeof ARTICLE_CHANNEL_JOB_STATE)[keyof typeof ARTICLE_CHANNEL_JOB_STATE]

export class ChannelJobService {
  private connections: Connections
  private knex: Knex
  private knexRO: Knex

  public constructor(connections: Connections) {
    this.connections = connections
    this.knex = connections.knex
    this.knexRO = connections.knexRO
  }

  public syncProcessingJobs = async (classifier: ChannelClassifier) => {
    const channelService = new ChannelService(this.connections)
    const jobs = await this.getProcessingJobs()
    if (!jobs.length) return

    const results = await classifier.getJobResults(jobs.map((j) => j.jobId))
    logger.info('results', JSON.stringify(results, null, 2))

    if (!results) return

    const resultMap = new Map(results.map((r) => [r?.jobId, r]))

    for (const job of jobs) {
      const result = resultMap.get(job.jobId)
      if (!result) continue

      const channels = await channelService.findTopicChannels()
      const newChannelProviderIds = result.channels
        ?.filter((c) => !channels.some((ch) => ch.providerId === c.channelId))
        .map((c) => c.channelId)

      if (newChannelProviderIds && newChannelProviderIds.length > 0) {
        for (const providerId of newChannelProviderIds) {
          const newChannel = await channelService.createTopicChannel({
            name: providerId,
            providerId,
            enabled: false,
          })
          channels.push(newChannel)
        }
      }

      try {
        if (
          result.state === ARTICLE_CHANNEL_JOB_STATE.finished &&
          result.channels &&
          result.channels.length > 0
        ) {
          const channelScores = result.channels.map((c) => ({
            channel_id: channels.find((ch) => ch.providerId === c.channelId)!
              .id,
            score: c.score,
          }))

          await this.insertChannelScores(job.articleId, channelScores)
        }
        await this.updateJobState(job.id, result.state)
      } catch (err) {
        logger.error('Error processing job:', err)
        await this.updateJobState(job.id, 'error')
      }
    }
  }

  public retryErrorJobs = async (classifier: ChannelClassifier) => {
    const jobs = await this.getErrorJobs()
    if (!jobs.length) return
    await this.retryJobs(jobs, classifier)
  }

  public retryRecentJobs = async (
    classifier: ChannelClassifier,
    days: number
  ) => {
    const jobs = await this.getRecentJobs(days * 24)
    if (!jobs.length) return
    await this.retryJobs(jobs, classifier)
  }

  private retryJobs = async (
    jobs: ArticleChannelJob[],
    classifier: ChannelClassifier
  ) => {
    const articleIds = jobs.map((j) => j.articleId)
    const articleVersions = await this.knexRO('article_version_newest').whereIn(
      'articleId',
      articleIds
    )

    // Create a map of articleId to version for easy lookup
    const articleIdToVersion = new Map(
      articleVersions.map((v) => [v.articleId, v])
    )

    const contentIds = articleVersions.map((v) => v.contentId)
    const contents = await this.knexRO('article_content').whereIn(
      'id',
      contentIds
    )

    // Create a map of contentId to content for easy lookup
    const contentIdToContent = new Map(contents.map((c) => [c.id, c]))

    // Process each unique article once
    const texts = articleIds.map((articleId) => {
      const version = articleIdToVersion.get(articleId)
      if (!version) return ''

      const content = contentIdToContent.get(version.contentId)
      if (!content) return ''

      return version.summary
        ? `${version.title}\n${version.summary}\n${content.content}`
        : `${version.title}\n${content.content}`
    })

    const results = await classifier.classify(texts)

    console.log('results', JSON.stringify(results, null, 2))

    if (!results) return

    // Update all jobs for each article with the same result
    for (let i = 0; i < articleIds.length; i++) {
      const articleId = articleIds[i]
      const result = results[i]
      if (!result) {
        console.error(`No result found for article: ${articleId}`)
        continue
      }
      // do not insert articles' channel result into the database which are handled by syncProcessingJobs
      await this.updateOrCreateProcessingJob(articleId, result.jobId)
    }
  }

  // Process jobs created or retried, only for latest job for each article
  public getProcessingJobs = async (): Promise<ArticleChannelJob[]> => {
    return this.knexRO
      .select('*')
      .from(
        this.knexRO
          .select('*')
          .distinctOn('article_id')
          .from('article_channel_job')
          .orderBy([
            { column: 'article_id', order: 'asc' },
            { column: 'created_at', order: 'desc' },
          ])
          .as('jobs')
      )
      .where('state', 'processing')
  }

  // get latest error job for each article
  private getErrorJobs = async (): Promise<ArticleChannelJob[]> => {
    return this.knexRO
      .select('*')
      .from(
        this.knexRO
          .select('*')
          .distinctOn('article_id')
          .from('article_channel_job')
          .orderBy([
            { column: 'article_id', order: 'asc' },
            { column: 'created_at', order: 'desc' },
          ])
          .as('jobs')
      )
      .where('state', 'error')
  }

  public getRecentJobs = async (
    hours: number
  ): Promise<ArticleChannelJob[]> => {
    return this.knexRO.select('*').from(
      this.knexRO
        .select('*')
        .distinctOn('article_id')
        .from('article_channel_job')
        .where(
          'created_at',
          '>',
          this.knexRO.raw(`CURRENT_TIMESTAMP - interval '${hours} hours'`)
        )
        .orderBy([
          { column: 'article_id', order: 'asc' },
          { column: 'created_at', order: 'desc' },
        ])
        .as('jobs')
    )
  }

  private updateJobState = async (
    id: string,
    state: string,
    retry?: boolean
  ) => {
    const updateData: Partial<ArticleChannelJob> = {
      state,
      updatedAt: new Date(),
    }

    if (retry) {
      updateData.retriedAt = new Date()
    }

    return this.knex('article_channel_job').where('id', id).update(updateData)
  }

  public updateOrCreateProcessingJob = async (
    articleId: string,
    jobId: string
  ) => {
    return this.knex('article_channel_job')
      .insert({
        article_id: articleId,
        job_id: jobId,
        state: ARTICLE_CHANNEL_JOB_STATE.processing,
        created_at: this.knex.fn.now(),
        updated_at: this.knex.fn.now(),
      })
      .onConflict(['article_id', 'job_id'])
      .merge({
        state: ARTICLE_CHANNEL_JOB_STATE.processing,
        updated_at: this.knex.fn.now(),
      })
  }

  public insertChannelScores = async (
    articleId: string,
    channelScores: Array<{
      channel_id: string
      score: number
    }>
  ) => {
    return this.knex.transaction(async (trx) => {
      // Delete existing unlabeled channel assignments
      await trx('topic_channel_article')
        .where('article_id', articleId)
        .where('is_labeled', false)
        .del()

      // Insert new channel scores if any
      if (channelScores.length > 0) {
        const values = channelScores.map((c) => ({
          article_id: articleId,
          channel_id: c.channel_id,
          score: c.score,
          created_at: this.knex.fn.now(),
          updated_at: this.knex.fn.now(),
        }))

        await trx('topic_channel_article')
          .insert(values)
          .onConflict(['article_id', 'channel_id'])
          .merge({
            score: this.knex.raw('EXCLUDED.score'),
            updated_at: this.knex.fn.now(),
          })
      }
    })
  }
}
