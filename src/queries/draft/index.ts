import slugify from '@matters/slugify'

import { countWords, makeSummary, toGlobalId } from 'common/utils'

import assets from './assets'
import audio from './audio'
import audiodrafts from './audiodrafts'
import collection from './collection'
import cover from './cover'
import drafts from './drafts'

export default {
  User: {
    drafts,
    audiodrafts
  },
  Draft: {
    id: ({ id }: { id: string }) => toGlobalId({ type: 'Draft', id }),
    slug: ({ title }: { title: string }) => slugify(title),
    wordCount: ({ content }: { content?: string }) =>
      content ? countWords(content) : 0,
    summary: ({ content, cover }: { content?: string; cover?: string }) =>
      content ? makeSummary(content, cover ? 110 : 140) : '',
    cover,
    collection,
    assets
  },
  Audiodraft: {
    id: ({ uuid }: { uuid: string }) => uuid,
    authorId: ({ id }: { id: string }) => toGlobalId({ type: 'User', id }),
    audio
  }
}
