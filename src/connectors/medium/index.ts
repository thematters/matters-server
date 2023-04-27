import axios from 'axios'
import * as cheerio from 'cheerio'
import { Knex } from 'knex'
import pThrottle from 'p-throttle'
import { v4 } from 'uuid'

import {
  ACCEPTED_UPLOAD_IMAGE_TYPES,
  UPLOAD_FILE_SIZE_LIMIT,
} from 'common/enums'
import logger from 'common/logger'
import { getFileName } from 'common/utils'
import { aws, cfsvc, knex } from 'connectors'
import { AWSService } from 'connectors/aws'
import { GQLAssetType } from 'definitions'

const throttle = pThrottle({
  limit: 2,
  interval: 1000, // equals to 600/5min, don't use more than half of cloudflare 1,200/5min global API rate limit
})

export class Medium {
  aws: AWSService
  cfsvc: typeof cfsvc
  knex: Knex

  private section = 'section.section--body'

  constructor() {
    this.aws = aws
    this.cfsvc = cfsvc
    this.knex = knex
    // this.cfThrottledUpload = throttle(async (...args) => cfsvc.baseUploadFile(...args))
  }

  /**
   * Convert html downloaded from Medium into draft format.
   *
   */
  convertRawHTML = async (html: string) => {
    const $ = cheerio.load(html || '', { decodeEntities: false })
    const title = this.getTitle($)
    const { content, assets } = await this.getContent($)
    return { title, content, assets }
  }

  /**
   * Create custom image block.
   *
   */
  createImageBlock = async (url: string, caption: string) => {
    const asset = await this.fetchAndUploadAsset(url, 'image')
    const src = `${this.aws.s3Endpoint}/${asset.key}`
    const content =
      `<figure class="image"><img src="${src}" data-asset-id="${asset.uuid}">` +
      `<figcaption><span>${caption}</span></figcaption></figure>`
    return { content, asset }
  }

  /**
   * Create custom iframe block.
   *
   */
  createIFrameBlock = (url: string, caption: string) => {
    const content =
      `<figure class="embed-video"><div class="iframe-container">` +
      `<iframe src="${url}" frameborder="0" allowfullscreen="true" sandbox="allow-scripts allow-same-origin allow-popups">` +
      `</iframe></div><figcaption><span>${caption}</span></figcaption></figure>`
    return { content }
  }

  /**
   * Fetch and upload assets embedded in post.
   *
   */
  fetchAndUploadAsset = async (url: string, assetType: 'image') => {
    const isImage = assetType === 'image'

    if (!isImage) {
      throw new Error(`${assetType} isn't supported.`)
    }

    try {
      const response = await axios.get(url, {
        responseType: 'stream',
        maxContentLength: UPLOAD_FILE_SIZE_LIMIT,
      })
      const disposition = response.headers['content-disposition']
      const mimetype = response.headers['content-type']
      const filename = getFileName(disposition, url)
      const upload = {
        createReadStream: () => response.data,
        mimetype,
        encoding: 'utf8',
        filename,
      }
      const uuid = v4()

      if (!ACCEPTED_UPLOAD_IMAGE_TYPES.includes(mimetype)) {
        throw new Error('Invalid image type.')
      }

      const cfThrottledUpload = throttle(
        (...args: [GQLAssetType, any, string]) =>
          this.cfsvc.baseUploadFile(...args)
      )

      // make sure both settled
      const [awsRes, cfsvcRes] = await Promise.allSettled([
        this.aws.baseUploadFile('embed' as GQLAssetType, upload, uuid),
        // this.cfsvc.baseUploadFile('embed' as GQLAssetType, upload, uuid)
        cfThrottledUpload('embed' as GQLAssetType, upload, uuid),
      ])

      // const failure = results.find((r) => r.status !== 'fulfilled')
      if (awsRes.status !== 'fulfilled' || cfsvcRes.status !== 'fulfilled') {
        if (awsRes.status !== 'fulfilled') {
          console.error(new Date(), 'aws s3 upload image ERROR:', awsRes.reason)
          throw awsRes.reason
        }
        if (cfsvcRes.status !== 'fulfilled') {
          console.error(
            new Date(),
            'cloudflare upload image ERROR:',
            cfsvcRes.reason
          )
          throw cfsvcRes.reason
        }
      }

      // const key = (settled.find((r) => r.status === 'fulfilled') as PromiseFulfilledResult<string>)?.value

      return { uuid, key: awsRes.value }
    } catch (error) {
      throw new Error(`Unable to upload from url: ${error}`)
    }
  }

  /**
   * Get real content of post. Also fetch and upload images embeded in post.
   *
   */
  getContent = async ($: cheerio.CheerioAPI) => {
    // purge unnecessary elements
    $(`${this.section} > div`).each((index, element) => {
      const dom = $(element)
      if (dom.hasClass('section-divider')) {
        dom.replaceWith('<hr />')
      }
      if (dom.hasClass('section-content')) {
        dom.replaceWith(dom.find('div.section-inner').children())
      }
    })
    $('*:not(section)').removeAttr('class')
    return this.restructureContent($)
  }

  /**
   * Get post title.
   *
   */
  getTitle = ($: cheerio.CheerioAPI) => {
    return $('header > h1').text()
  }

  /**
   * Replace `\n` due to Medium does not change it to HTML tag.
   *
   */
  processBreakInText = (dom: cheerio.Cheerio<cheerio.Element>) => {
    dom.find('br').replaceWith('<br class="smart">')
    return (dom.html() || '').replace(/\n/g, '<br class="smart">')
  }

  /**
   * Restructure HTML elements in order to fit our formats.
   *
   */
  restructureContent = async ($: cheerio.CheerioAPI) => {
    const assets: Array<Record<string, any>> = []
    const contents: string[] = []
    const elements = $(this.section).children().toArray()

    for (const [index, element] of elements.entries()) {
      const dom = $(element)
      const name = element.name
      switch (name) {
        case 'blockquote':
          contents.push(`<blockquote>${dom.text()}</blockquote>`)
          break
        case 'figure':
          const caption = dom.find('figcaption').text() || ''
          const image = dom.find('img')
          if (image && image.attr('src')) {
            try {
              const url = image.attr('src')
              const { content, asset } = await this.createImageBlock(
                url || '',
                caption
              )
              contents.push(content)
              assets.push(asset)
            } catch (err) {
              logger.error(err)
            }
            break
          }
          break
        case 'h3':
        case 'h4':
          if (index === 1 && name === 'h3') {
            // skip duplicated title
            break
          }
          contents.push(`<h2>${dom.text()}</h2>`)
          break
        case 'hr':
          if (index === 0) {
            // skip medium extra divider
            break
          }
          contents.push(dom.html() || '<hr/>')
          break
        case 'pre':
          contents.push(`<pre class="ql-syntax">${dom.text()}</pre>`)
          break
        case 'ol':
          contents.push(`<ol>${dom.html()}</ol>`)
          break
        case 'ul':
          contents.push(`<ul>${dom.html()}</ul>`)
          break
        default:
          const processedText = this.processBreakInText(dom || '')
          if (processedText) {
            contents.push(`<p>${processedText}</p>`)
          }
          break
      }
    }
    return { content: contents.join(''), assets }
  }
}

export const medium = new Medium()
