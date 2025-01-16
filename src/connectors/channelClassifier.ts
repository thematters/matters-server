import axios, { type AxiosRequestConfig } from 'axios'

import { ARTICLE_CHANNEL_JOB_STATE } from 'common/enums'
import { environment, isTest } from 'common/environment'
import { getLogger } from 'common/logger'
import { ValueOf } from 'definitions'

const logger = getLogger('channel-classifier')

type APIResponse = Array<{
  state: 'Processing' | 'Finished' | 'Error'
  modelSignature: string
  jobId: string
}>

type Response = {
  state: ValueOf<typeof ARTICLE_CHANNEL_JOB_STATE>
  jobId: string
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
        texts: [text],
      },
    }

    try {
      const response = await axios(config)
      const data = response.data as APIResponse
      const state =
        data[0].state === 'Finished'
          ? ARTICLE_CHANNEL_JOB_STATE.finished
          : data[0].state === 'Processing'
          ? ARTICLE_CHANNEL_JOB_STATE.processing
          : ARTICLE_CHANNEL_JOB_STATE.error

      return {
        state,
        jobId: data[0].jobId,
      }
    } catch (error) {
      logger.error(error)
      return null
    }
  }
}
