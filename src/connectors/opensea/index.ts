import { RequestOptions, RESTDataSource } from 'apollo-datasource-rest'

import { CACHE_TTL } from 'common/enums/index.js'
import { environment } from 'common/environment.js'
import logger from 'common/logger.js'

export class OpenSeaService extends RESTDataSource {
  apiKey?: string | undefined

  constructor() {
    super()
    // Sets the base URL for the REST API
    // https://rinkeby-api.opensea.io/api
    // or https://api.opensea.io/api/v1/assets?asset_contract_address=<...>&owner=<...>
    this.baseURL = environment.openseaAPIBase
    this.apiKey = environment.openseaAPIKey
  }

  willSendRequest(request: RequestOptions) {
    if (this.apiKey) {
      request.headers.set('X-API-KEY', this.apiKey)
    }
  }

  async getAssets({
    owner,
    asset_contract_address = environment.traveloggersContractAddress,
  }: {
    owner: string
    asset_contract_address?: string
  }) {
    try {
      const data = await this.get(
        'assets',
        {
          owner,
          asset_contract_address,
          order_direction: 'desc',
          offset: 0,
          limit: 20,
        },
        {
          cacheOptions: {
            // use 1 hour caching, override server-side provided cache-control: max-age=300
            ttl: CACHE_TTL.MEDIUM,
          },
        }
      )

      // logger.info(`fetched ${data.assets?.length} assets for owner: "${owner}".`)

      return data.assets
    } catch (err) {
      logger.error(err)
      // console.error(new Date(), 'ERROR:', err)

      return []
    }
  }
}
