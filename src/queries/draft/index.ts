import { toGlobalId } from 'common/utils'

import drafts from './drafts'
import audiodrafts from './audiodrafts'
import cover from './cover'
import audio from './audio'

export default {
  User: {
    drafts,
    audiodrafts
  },
  Draft: {
    id: ({ id }: { id: string }) => toGlobalId({ type: 'Draft', id }),
    cover
  },
  Audiodraft: {
    id: ({ uuid }: { uuid: string }) => uuid,
    authorId: ({ id }: { id: string }) => toGlobalId({ type: 'User', id }),
    audio
  }
}
