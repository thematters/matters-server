import { ResponseType } from 'definitions'

import articleResponseCount from './article/responseCount'
import articleResponses from './article/responses'

export default {
  Article: {
    responseCount: articleResponseCount,
    responses: articleResponses,
  },
  Response: {
    __resolveType: ({ __type }: { __type: ResponseType }) => __type,
  },
}
