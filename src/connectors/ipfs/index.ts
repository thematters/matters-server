///<reference path="./ipfs-http-client.d.ts" />
// import { cmd } from './ipfs-http-client'
import * as cheerio from 'cheerio'
import axios from 'axios'
import { resolve as urlResolve } from 'url'
import ipfsClient = require('ipfs-http-client')
import { environment } from 'common/environment'

const { ipfsAddress, domain } = environment

class IPFS {
  client: ipfsCmds

  constructor() {
    this.client = ipfsClient(ipfsAddress || '')
  }

  getDataAsFile = async (
    url: string,
    path: string,
    mutateOrigin: () => void
  ) => {
    try {
      const fullUrl =
        url.indexOf('://') >= 0 ? url : urlResolve(domain || '', url)
      const { data } = await axios.get(fullUrl, { responseType: 'arraybuffer' })
      mutateOrigin()
      return { path, content: Buffer.from(data, 'binary') }
    } catch (err) {
      console.log(`Fetching data for ${url} failed`)
    }
  }

  addHTML = async (html: string) => {
    const prefix = 'article'
    // TODO: parse html and get data for http urls

    let assetsPromises: Array<
      Promise<{ path: string; content: Buffer } | undefined>
    > = []
    const $ = cheerio.load(html)

    $('img').each((index, image) => {
      const imageSrc = $(image).attr('src')
      // check if it's data url
      // TODO: check other src format
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

    const htmlBundle = [
      {
        path: `${prefix}/index.html`,
        content: Buffer.from(html)
      }
      // ...assets.filter(asset => asset)
    ]
    const result = await this.client.files.add(htmlBundle, { pin: true })

    const [{ hash }] = result.filter(
      ({ path }: { path: string }) => path === prefix
    )
    return hash
  }
}

export const ipfs = new IPFS()
