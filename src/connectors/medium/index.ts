import axios, { AxiosRequestConfig } from 'axios'
import Knex from 'knex'
import _ from 'lodash'
import qs from 'qs'
import { v4 } from 'uuid'

import { OAUTH_PROVIDER, UPLOAD_FILE_SIZE_LIMIT } from 'common/enums'
import { environment } from 'common/environment'
import logger from 'common/logger'
import { getFileName } from 'common/utils'
import { aws, knex } from 'connectors'
import { AWSService } from 'connectors/aws'
import { GQLAssetType } from 'definitions'

import { postQuery, postsQuery } from './graphql'

type RequestProps = {
  endpoint: string
  headers?: { [key: string]: any }
  withClientCredential?: boolean
  mediumData: { [key: string]: any }
} & AxiosRequestConfig

export class Medium {
  aws: AWSService
  knex: Knex

  constructor() {
    this.aws = aws
    this.knex = knex
  }

  /**
   * Base Request
   */
  request = async ({
    endpoint,
    headers = {},
    withClientCredential,
    mediumData,
    ...axiosOptions
  }: RequestProps) => {
    const makeRequest = ({ accessToken }: { accessToken?: string }) => {
      // Headers
      if (accessToken) {
        headers = {
          ...headers,
          Authorization: `Bearer ${accessToken}`
        }
      }
      return axios({
        url: endpoint,
        headers,
        ...axiosOptions
      })
    }

    try {
      return await makeRequest({
        accessToken: mediumData.accessToken
      })
    } catch (error) {
      // refresh token and retry
      if (mediumData.accessToken && error.code === 'expired') {
        const accessToken = await this.refreshToken({
          userId: mediumData.userId,
          refreshToken: mediumData.refreshToken
        })
        return makeRequest({ accessToken })
      }

      // below are other error code handler

      logger.error(error)
      throw error
    }
  }

  /**
   * Refresh access token by using refresh_token.
   *
   */
  refreshToken = async ({
    userId,
    refreshToken
  }: {
    userId: string
    refreshToken: string
  }): Promise<string> => {
    // fetch new access_token
    const response = await this.request({
      endpoint: environment.mediumTokenURL,
      withClientCredential: true,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      mediumData: {},
      method: 'POST',
      data: qs.stringify({
        client_id: environment.mediumClientId,
        client_secret: environment.mediumClientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    })

    // update user_oauth
    const data = response?.data
    try {
      await this.knex('user_oauth')
        .where({ userId, provider: OAUTH_PROVIDER.medium })
        .update({
          accessToken: data.access_token,
          updatedAt: new Date()
        })
    } catch (error) {
      logger.error(error)
    }
    return data.access_token
  }

  /**
   * Get basic user info.
   *
   */
  getUserInfo = async ({
    userId,
    accessToken,
    refreshToken
  }: {
    userId: string
    accessToken: string
    refreshToken: string
  }): Promise<any> => {
    return this.request({
      endpoint: environment.mediumApiMeURL,
      withClientCredential: true,
      mediumData: { userId, accessToken, refreshToken },
      method: 'GET'
    })
  }

  /**
   * Get user's all post ids through Medium's GQL API.
   *
   */
  getUserPostIds = async ({ userId }: { userId: string }) => {
    let ids: any[] = []
    let variables: any = {
      userId,
      pagingOptions: {
        limit: 25,
        page: null,
        source: null,
        to: null,
        ignoredIds: null
      }
    }

    while (variables) {
      const response = await axios.post(environment.mediumGQLURL, {
        query: postsQuery,
        variables,
        headers: { 'Content-Type': 'application/json' }
      })
      const data = _.get(response, 'data.data.user.profileStreamConnection')

      variables = null

      if (data) {
        const posts = _.get(data, 'stream', [])
        const page = _.get(data, 'pagingInfo.next', null)

        const postIds = posts
          .map((item: any) => item?.itemType?.post?.id)
          .filter((id: any) => id)
        ids = [...ids, ...postIds]

        if (page) {
          delete page.__typename
          variables = { userId, pagingOptions: page }
        }
      }
    }
    return ids
  }

  /**
   * Get contents of a user's post through Medium's GQL API.
   *
   */
  getUserPostParagraphs = async ({ postId }: { postId: string }) => {
    const variables = {
      postId,
      showHighlights: false,
      showNotes: false
    }
    const response = await axios.post(environment.mediumGQLURL, {
      query: postQuery,
      variables,
      headers: { 'Content-Type': 'application/json' }
    })
    return {
      title: _.get(response, 'data.data.post.title', null),
      paragraphs: _.get(
        response,
        'data.data.post.content.bodyModel.paragraphs',
        null
      )
    }
  }

  /**
   * Generate figure block.
   *
   */
  generateFigureBlock = (type: string, data: { [key: string]: any }) => {
    switch (type) {
      case 'IMG':
        const { url, uuid, text } = data
        return `<figure class="image"><img src="${url}" data-asset-id="${uuid}"><figcaption><span>${text}</span></figcaption></figure>`
      default:
        return ''
    }
  }

  /**
   * Convert post paragraphs into HTML string.
   *
   */
  convertPostParagraphsToHTML = async ({
    paragraphs
  }: {
    paragraphs: any[]
  }) => {
    const assets: Array<{ uuid: string; key: string }> = []
    const html: string[] = []
    for (const paragraph of paragraphs) {
      const { type, text } = paragraph
      switch (type) {
        case 'H3':
          html.push(`<h2>${text}</h2>`)
          break
        case 'IMG':
          const { metadata } = paragraph
          const result = await this.fetchAssetAndUpload(metadata.id)
          const url = `${this.aws.s3Endpoint}/${result.key}`
          assets.push(result)
          html.push(
            this.generateFigureBlock(paragraph.type, {
              url,
              uuid: result.uuid,
              text
            })
          )
          break
        case 'PRE':
          html.push(`<pre class="ql-syntax">${text}</pre>`)
          break
        case 'IFRAME':
          html.push('')
          break
        case 'MIXTAPE_EMBED':
          const { mixtapeMetadata } = paragraph
          html.push(
            `<p><a href="${mixtapeMetadata.href}" rel="noopener noreferrer" target="_blank">${text}</a></p>`
          )
          break
        default:
          html.push(`<p>${text}</p>`)
          break
      }
    }
    return { html: html.join(''), assets }
  }

  /**
   * Fetch assets from Medium.
   *
   */
  fetchAssetAndUpload = async (id: string) => {
    try {
      const url = `${environment.mediumImgURL}/${id}`
      const response = await axios.get(url, {
        responseType: 'stream',
        maxContentLength: UPLOAD_FILE_SIZE_LIMIT
      })
      const disposition = response.headers['content-disposition']
      const filename = getFileName(disposition, url)
      const upload = {
        createReadStream: () => response.data,
        mimetype: response.headers['content-type'],
        encoding: 'utf8',
        filename
      }
      const uuid = v4()
      const key = await this.aws.baseUploadFile(
        'embed' as GQLAssetType,
        upload,
        uuid
      )
      return { uuid, key }
    } catch (error) {
      throw new Error(`Unable to upload from url: ${error}`)
    }
  }
}

export const medium = new Medium()
