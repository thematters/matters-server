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
    $('head').append(`
    <script>
      !function(){var analytics=window.analytics=window.analytics||[];if(!analytics.initialize)if(analytics.invoked)window.console&&console.error&&console.error("Segment snippet included twice.");else{analytics.invoked=!0;analytics.methods=["trackSubmit","trackClick","trackLink","trackForm","pageview","identify","reset","group","track","ready","alias","debug","page","once","off","on"];analytics.factory=function(t){return function(){var e=Array.prototype.slice.call(arguments);e.unshift(t);analytics.push(e);return analytics}};for(var t=0;t<analytics.methods.length;t++){var e=analytics.methods[t];analytics[e]=analytics.factory(e)}analytics.load=function(t,e){var n=document.createElement("script");n.type="text/javascript";n.async=!0;n.src="https://cdn.segment.com/analytics.js/v1/"+t+"/analytics.min.js";var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(n,a);analytics._loadOptions=e};analytics.SNIPPET_VERSION="4.1.0";
      analytics.load("Q61o0JYbkuY6xmL5x6ViRThCrLaDEUpL");
      analytics.page();
      }}();
    </script>`)

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
