import axios from 'axios'
import * as cheerio from 'cheerio'
import ipfsClient = require('ipfs-http-client')
import { uniqBy } from 'lodash'
import { resolve as urlResolve } from 'url'

import { environment } from 'common/environment'
import logger from 'common/logger'

import ipfsArticleTemplate from './templates/article'

const { ipfsHost, ipfsPort, domain } = environment

export class IPFS {
  client: IPFS.FilesAPI & ipfsCmds

  makeHTML = ipfsArticleTemplate

  constructor() {
    this.client = ipfsClient({
      host: ipfsHost || '',
      port: ipfsPort,
      protocol: 'http'
    })
  }

  // fetch data and return buffer
  getDataAsFile = async (
    url: string,
    path: string,
    mutateOrigin?: () => void
  ) => {
    if (!url) {
      return
    }
    try {
      const fullUrl =
        url.indexOf('://') >= 0 ? url : urlResolve(domain || '', url)
      const { data } = await axios.get(fullUrl, { responseType: 'arraybuffer' })

      if (mutateOrigin) {
        mutateOrigin()
      }

      return { path, content: Buffer.from(data, 'binary') }
    } catch (err) {
      logger.info(`Fetching data for ${url} failed`)
      return
    }
  }

  // add html string and related assets
  addHTML = async (html: string) => {
    const prefix = 'article'

    // get image assets
    const assetsPromises: Array<Promise<
      { path: string; content: Buffer } | undefined
    >> = []
    const $ = cheerio.load(html, { decodeEntities: false })

    const getSrc = (index: number, element: CheerioElement) => {
      const elementSrc = $(element).attr('src')
      // check if it's data url
      if (elementSrc && !elementSrc.startsWith('data:')) {
        // assuming it's http url
        const assetPath =
          elementSrc.split('/').pop() ||
          `${index.toString()}-${element.tagName}`
        const mutateOrigin = () => $(element).attr('src', assetPath)
        assetsPromises.push(
          this.getDataAsFile(elementSrc, `${prefix}/${assetPath}`, mutateOrigin)
        )
      }
    }

    // handle images
    $('img').each((index, image) => {
      getSrc(index, image)
    })

    // handle audios
    $('audio source').each((index, audio) => {
      getSrc(index, audio)
    })

    // add segment
    $('head').append(
      `<script type="text/javascript" src="//static.matters.news/analytics.js"></script>`
    )

    const assets = await Promise.all(assetsPromises)

    // bundle html
    const htmlBundle = [
      {
        path: `${prefix}/index.html`,
        content: Buffer.from($.html())
      },
      ...uniqBy(
        assets.filter(asset => asset),
        'path'
      )
    ]
    const result = await this.client.add(htmlBundle, { pin: true })

    // filter out the hash for the bundle
    const [{ hash }] = result.filter(
      ({ path }: { path: string }) => path === prefix
    )
    return hash
  }
}

export const ipfs = new IPFS()
