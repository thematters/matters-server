import { ARTICLE_CHANNEL_JOB_STATE } from '#common/enums/index.js'
import { environment, isTest } from '#common/environment.js'
import { getLogger } from '#common/logger.js'
import { ValueOf } from '#definitions/index.js'
import axios, { type AxiosRequestConfig } from 'axios'

const logger = getLogger('channel-classifier')

type APIResponse = Array<{
  state: 'Processing' | 'Finished' | 'Error'
  modelSignature: string
  jobId: string
}>

type Response = Array<{
  state: ValueOf<typeof ARTICLE_CHANNEL_JOB_STATE>
  jobId: string
}>

export class ChannelClassifier {
  private apiUrl: string

  public constructor() {
    this.apiUrl = environment.channelClassificationApiUrl
  }

  private _getState = (state: 'Processing' | 'Finished' | 'Error') => {
    return state === 'Finished'
      ? ARTICLE_CHANNEL_JOB_STATE.finished
      : state === 'Processing'
      ? ARTICLE_CHANNEL_JOB_STATE.processing
      : ARTICLE_CHANNEL_JOB_STATE.error
  }

  public classify = async (texts: string[]): Promise<Response | null> => {
    if (isTest || !this.apiUrl) {
      return null
    }

    const config: AxiosRequestConfig = {
      method: 'post',
      url: this.apiUrl,
      data: {
        texts,
      },
    }

    try {
      const response = await axios(config)
      const data = response.data as APIResponse

      return data.map(({ state, jobId }) => ({
        state: this._getState(state),
        jobId,
      }))
    } catch (error) {
      logger.error(error)
      return null
    }
  }
}
