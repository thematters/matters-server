import { Context } from 'definitions'
import { toGlobalId } from 'common/utils'

import drafts from './drafts'
import audioDrafts from './audioDrafts'
import cover from './cover'
import audio from './audio'

export default {
  User: {
    drafts,
    audioDrafts
  },
  Draft: {
    id: ({ id }: { id: string }) => toGlobalId({ type: 'Draft', id }),
    cover
  },
  AudioDraft: {
    id: ({ uuid }: { uuid: string }) => uuid,
    authorId: ({ id }: { id: string }) => toGlobalId({ type: 'User', id }),
    audio
  }
}
