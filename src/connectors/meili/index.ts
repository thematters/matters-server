import { MeiliSearch } from 'meilisearch'
// import _ from 'lodash'

import { environment } from 'common/environment.js'

export const meiliClient = new MeiliSearch({
  host: environment.meiliSearch_Server,
  apiKey: environment.meiliSearch_apiKey,
})
