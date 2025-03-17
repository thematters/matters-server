import { ResponseType } from '#definitions/index.js'

import articleResponseCount from './article/responseCount.js'
import articleResponses from './article/responses.js'

export default {
  Article: {
    responseCount: articleResponseCount,
    responses: articleResponses,
  },
  Response: {
    __resolveType: ({ __type }: { __type: ResponseType }) => __type,
  },
}
