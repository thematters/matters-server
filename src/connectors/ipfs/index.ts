import { generateKeyPair } from 'crypto'
import FormData from 'form-data'
import { create } from 'ipfs-http-client'
import fetch from 'node-fetch'
import { Readable } from 'stream'
import { promisify } from 'util'
import { v4 } from 'uuid'

const generateKeyPairPromisified = promisify(generateKeyPair)

import { environment } from 'common/environment'

const ipfsServerUrl = `http://${environment.ipfsHost}:${environment.ipfsPort}/api/v0`

export class IPFS {
  client: any

  constructor() {
    this.client = create({
      // host: environment.ipfsHost,
      // port: parseInt(environment.ipfsPort, 10),
      // protocol: 'http',
      url: ipfsServerUrl,
      headers: {
        // for load balancer sticky session
        // https://docs.aws.amazon.com/elasticloadbalancing/latest/classic/elb-sticky-sessions.html
        cookie: `app-cookie=${v4()}`,
      },
    })
  }

  // same as `openssl genpkey -algorithm ED25519`
  genKey = async () => generateKeyPairPromisified('ed25519') // {

  // this.client.key.gen(name)
  // const key = await generateKeyPairPromisified('ed25519')
  // return key.privateKey.export({ format: 'pem', type: 'pkcs8', // cipher: 'aes-256-cbc', passphrase:'pass1 top secret', })
  // }

  importKey = async (name: string, pem: string) => {
    const formData = new FormData()
    const url = new URL(`${ipfsServerUrl}/key/import`)
    url.searchParams.set('arg', name)
    url.searchParams.set('format', 'pem-pkcs8-cleartext')
    formData.append('file', Readable.from([pem]), 'keyfile')
    const res = await fetch(url, {
      method: 'POST',
      body: formData,
    })
    // console.log(new Date(), 'key/import res:', res)
    const imported = await res.json()
    // console.log(new Date(), 'key/import res json:', imported)
    // return res.json()
    return imported
  }

  publish = async (cid: string, options: Record<string, any>) =>
    this.client.name.publish(cid, options)
}

export const ipfs = new IPFS()
