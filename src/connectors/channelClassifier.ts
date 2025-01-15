import axios, { type AxiosRequestConfig } from 'axios'

import { ARTICLE_CHANNEL_JOB_STATE } from 'common/enums'
import { environment, isTest } from 'common/environment'
import { getLogger } from 'common/logger'
import { ValueOf } from 'definitions'

const logger = getLogger('channel-classifier')

type APIResponse = {
  state: 'Processing' | 'Finished' | 'Error'
  modelSignature: string
  jobId: string
  data: Array<{
    channel: string
    score: number
  }>
}

type Response = {
  state: ValueOf<typeof ARTICLE_CHANNEL_JOB_STATE>
  jobId: string
  channels: Array<{
    channel: string
    score: number
  }>
}

export class ChannelClassifier {
  private apiUrl: string

  public constructor() {
    this.apiUrl = environment.channelClassificationApiUrl
  }

  public classify = async (text: string): Promise<Response | null> => {
    if (isTest || !this.apiUrl) {
      return null
    }

    const config: AxiosRequestConfig = {
      method: 'post',
      url: this.apiUrl,
      data: {
        text,
      },
    }

    try {
      const response = await axios(config)
      const data = response.data as APIResponse
      const state =
        data.state === 'Finished'
          ? ARTICLE_CHANNEL_JOB_STATE.finished
          : data.state === 'Processing'
          ? ARTICLE_CHANNEL_JOB_STATE.processing
          : ARTICLE_CHANNEL_JOB_STATE.error

      return {
        state,
        jobId: data.jobId,
        channels: data.data,
      }
    } catch (error) {
      logger.error(error)
      return null
    }
  }
}
