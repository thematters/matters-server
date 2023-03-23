import { generateKeyPair } from 'crypto'
import FormData from 'form-data'
import { create } from 'ipfs-http-client'
import fetch from 'node-fetch'
import { Readable } from 'stream'
import { promisify } from 'util'
// import { v4 } from 'uuid'

const generateKeyPairPromisified = promisify(generateKeyPair)

import { environment } from 'common/environment.js'

const ipfsServerUrls = (
  environment.ipfsServers ||
  `http://${environment.ipfsHost}:${environment.ipfsPort}/api/v0`
)
  .trim()
  .split(/,\s*/)
  .filter(Boolean)

// In-App load-balancer, instead of transparent EC2 load balancer
export class IPFSServer {
  // 1 active primary + multiple backup secondaries
  clients: any[]

  constructor() {
    this.clients = ipfsServerUrls.map((url) => create({ url }))
  }

  get size() {
    return this.clients.length
  }
  get client() {
    // const idx = active ? 0 : Math.floor(1 + Math.random() * (this.size - 1))
    return this.clients[0]
  }
  get backupClient() {
    const idx = Math.floor(1 + Math.random() * (this.size - 1))
    return this.clients[idx]
  }

  // same as `openssl genpkey -algorithm ED25519`
  genKey = async () => generateKeyPairPromisified('ed25519') // {

  // JS implementation of IPFS KEY is incompatible between JS-IPFS vs Go-IPFS (Kubo)
  // https://github.com/ipfs/js-ipfs/issues/3547
  importKey = async ({
    name,
    pem,
    useActive = true,
  }: {
    name: string
    pem: string
    useActive?: boolean
  }) => {
    const idx = useActive ? 0 : Math.floor(1 + Math.random() * (this.size - 1))
    const formData = new FormData()

    const url = new URL(`${ipfsServerUrls[idx]}/api/v0/key/import`)
    url.searchParams.set('arg', name)
    url.searchParams.set('format', 'pem-pkcs8-cleartext')
    formData.append('file', Readable.from([pem]), 'keyfile')

    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    })
    try {
      // console.log(new Date(), `POST ${ipfsServerUrls[idx]}/api/v0/key/import with formData:`, formData, 'res:', res.ok, res.headers)
      const imported = await res.json()

      return { imported, client: this.clients[idx] }
    } catch (err) {
      console.error(
        new Date(),
        'importKey ERROR:',
        err,
        res.ok,
        res.headers
        // await res.text()
      )
    }
  }
}

export const ipfsServers = new IPFSServer()
