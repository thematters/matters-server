import { ResponseType } from 'definitions'

import articleResponses from './article/responses'

export default {
  Article: {
    responses: articleResponses
  },
  Response: {
    __resolveType: ({ type }: { type: ResponseType }) => {
      return type
    }
  }
}
