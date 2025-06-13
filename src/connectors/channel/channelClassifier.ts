import { ARTICLE_CHANNEL_JOB_STATE } from '#common/enums/index.js'
import { getLogger } from '#common/logger.js'
import axios, { type AxiosRequestConfig } from 'axios'

import { type JobState } from './channelJobService.js'

const logger = getLogger('channel-classifier')

type APIJobResult = {
  jobId: string
  state: string
  data: Array<{
    channel: string
    score: number
  }>
}

type JobResult = {
  jobId: string
  state: JobState
  channels?: Array<{
    channelId: string
    score: number
  }>
}

export class ChannelClassifier {
  private apiUrl: string

  public constructor(apiUrl: string) {
    this.apiUrl = apiUrl
  }

  private getState = (state: string): JobState => {
    if (state === 'Finished') return ARTICLE_CHANNEL_JOB_STATE.finished
    if (state === 'Processing') return ARTICLE_CHANNEL_JOB_STATE.processing
    return ARTICLE_CHANNEL_JOB_STATE.error
  }

  public classify = async (
    texts: string | string[]
  ): Promise<JobResult[] | null> => {
    if (!this.apiUrl) {
      return null
    }

    const config: AxiosRequestConfig = {
      method: 'post',
      url: this.apiUrl,
      data: { texts: Array.isArray(texts) ? texts : [texts] },
    }

    try {
      const response = await axios(config)
      const result = response.data as APIJobResult[]

      logger.info('result', JSON.stringify(result, null, 2))

      return result.map((data) => ({
        jobId: data.jobId,
        state: this.getState(data.state),
      }))
    } catch (error) {
      logger.error('Channel classifier error:', error)
      return null
    }
  }

  public getJobResults = async (
    jobIds: string[]
  ): Promise<Array<JobResult | null>> => {
    if (!this.apiUrl) {
      return jobIds.map(() => null)
    }

    const config: AxiosRequestConfig = {
      method: 'post',
      url: this.apiUrl,
      data: { jobIds },
    }

    try {
      const response = await axios(config)
      const results = response.data as APIJobResult[]

      logger.info('results', JSON.stringify(results, null, 2))

      return results.map((data) => ({
        jobId: data.jobId,
        state: this.getState(data.state),
        channels:
          data.state === 'Finished'
            ? data.data.map((c) => ({
                channelId: c.channel,
                score: c.score,
              }))
            : undefined,
      }))
    } catch (error) {
      logger.error('Channel classifier error:', error)
      return jobIds.map(() => null)
    }
  }

  public getJobResult = async (jobId: string): Promise<JobResult | null> => {
    const results = await this.getJobResults([jobId])
    return results[0]
  }
}
