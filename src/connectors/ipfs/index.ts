///<reference path="./ipfs-http-client.d.ts" />
// import { cmd } from './ipfs-http-client'
import * as cheerio from 'cheerio'
import ipfsClient = require('ipfs-http-client')
import axios from 'axios'
import { resolve as urlResolve } from 'url'
import { uniqBy } from 'lodash'

import logger from 'common/logger'
import { environment } from 'common/environment'
import ipfsArticleTemplate from './templates/article'

const { ipfsHost, ipfsPort, domain } = environment

export class IPFS {
  client: IPFS.FilesAPI & ipfsCmds

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

  makeHTML = ipfsArticleTemplate

  // add html string and related assets
  addHTML = async (html: string) => {
    const prefix = 'article'

    // get image assets
    let assetsPromises: Array<
      Promise<{ path: string; content: Buffer } | undefined>
    > = []
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

    $('img').each((index, image) => {
      getSrc(index, image)
    })

    $('audio source').each((index, audio) => {
      getSrc(index, audio)
    })

    const assets = await Promise.all(assetsPromises)

    // bundle html
    const htmlBundle = [
      {
        path: `${prefix}/index.html`,
        content: Buffer.from($.html())
      },
      ...uniqBy(assets.filter(asset => asset), 'path')
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
