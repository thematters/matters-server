import { RESTDataSource, AugmentedRequest } from '@apollo/datasource-rest'

import { CACHE_TTL } from 'common/enums'
import { contract, environment } from 'common/environment'
import { getLogger } from 'common/logger'

const logger = getLogger('service-opensea')

export class OpenSeaService extends RESTDataSource {
  private apiKey?: string | undefined

  public constructor() {
    super()
    // Sets the base URL for the REST API
    // https://rinkeby-api.opensea.io/api
    // or https://api.opensea.io/api/v1/assets?asset_contract_address=<...>&owner=<...>
    this.baseURL = environment.openseaAPIBase
    this.apiKey = environment.openseaAPIKey
  }

  public override willSendRequest(_: string, request: AugmentedRequest) {
    if (this.apiKey) {
      request.headers['X-API-KEY'] = this.apiKey
    }
  }

  public async getAssets({
    owner,
    asset_contract_address = contract.ethereum.traveloggersAddress,
  }: {
    owner: string
    asset_contract_address?: string
  }) {
    try {
      const data = await this.get('assets', {
        params: {
          owner,
          asset_contract_address,
          order_direction: 'desc',
          offset: '0',
          limit: '20',
        },
        cacheOptions: {
          // use 1 hour caching, override server-side provided cache-control: max-age=300
          ttl: CACHE_TTL.MEDIUM,
        },
      })

      // logger.info(`fetched ${data.assets?.length} assets for owner: "${owner}".`)

      return data.assets
    } catch (err) {
      logger.error(err)

      return []
    }
  }
}
