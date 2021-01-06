import ipfsClient = require('ipfs-http-client')

import { environment } from 'common/environment'
export class IPFS {
  client: IPFS.FilesAPI & ipfsCmds

  constructor() {
    this.client = ipfsClient({
      host: environment.ipfsHost,
      port: environment.ipfsPort,
      protocol: 'http',
    })
  }
}

export const ipfs = new IPFS()
