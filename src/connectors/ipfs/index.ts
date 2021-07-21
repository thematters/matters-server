import { create } from 'ipfs-http-client'

import { environment } from 'common/environment'

export class IPFS {
  client: any

  constructor() {
    this.client = create({
      host: environment.ipfsHost,
      port: parseInt(environment.ipfsPort, 10),
      protocol: 'http',
    })
  }
}

export const ipfs = new IPFS()
