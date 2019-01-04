///<reference path="./ipfs-http-client.d.ts" />
// import { cmd } from './ipfs-http-client'
import * as cheerio from 'cheerio'
import axios from 'axios'
import { resolve as urlResolve } from 'url'
import ipfsClient = require('ipfs-http-client')
import { environment } from 'common/environment'

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
      console.log(`Fetching data for ${url} failed`)
      return
    }
  }

  // add html string and related assets
  addHTML = async (html: string) => {
    const prefix = 'article'

    // get image assets
    let assetsPromises: Array<
      Promise<{ path: string; content: Buffer } | undefined>
    > = []
    const $ = cheerio.load(html)

    $('img').each((index, image) => {
      const imageSrc = $(image).attr('src')
      // check if it's data url
      if (!imageSrc.startsWith('data:')) {
        // assuming it's http url
        const imagePath = `${index}.${imageSrc.split('.').slice(-1)[0]}`
        const mutateOrigin = () => $(image).attr('src', imagePath)
        assetsPromises.push(
          this.getDataAsFile(imageSrc, `${prefix}/${imagePath}`, mutateOrigin)
        )
      }
    })
    const assets = await Promise.all(assetsPromises)

    // bundle html
    const htmlBundle = [
      {
        path: `${prefix}/index.html`,
        content: Buffer.from(html)
      },
      ...assets.filter(asset => asset)
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
