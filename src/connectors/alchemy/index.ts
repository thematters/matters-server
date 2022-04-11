import axios from 'axios'

import { environment } from 'common/environment'

const { alchemyApiKey } = environment

export enum AlchemyNetwork {
  Mainnet = 'eth-mainnet',
  Rinkeby = 'eth-rinkeby',
  PolygonMainnet = 'polygon-mainnet.g',
  PolygonMumbai = 'polygon-mumbai.g',
}

export class Alchemy {
  getNFTs = async ({
    network,
    owner,
    contract,
    withMetadata = false,
  }: {
    network: AlchemyNetwork
    owner: string
    contract: string
    withMetadata?: boolean
  }) => {
    const baseURL = `https://${network}.alchemyapi.io/v2/${alchemyApiKey}/getNFTs/`

    const result = await axios({
      method: 'get',
      url: `${baseURL}?owner=${owner}&contractAddresses[]=${contract}&withMetadata=${withMetadata}`,
    })

    return result.data
  }
}

export const alchemy = new Alchemy()
