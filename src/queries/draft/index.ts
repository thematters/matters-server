import { makeSummary } from '@matters/matters-html-formatter'
import slugify from '@matters/slugify'

import { countWords, toGlobalId } from 'common/utils'

import article from './article'
import articleDrafts from './article/drafts'
import assets from './assets'
import circle from './circle'
import collection from './collection'
import draftCover from './cover'
import drafts from './drafts'

export default {
  Article: {
    drafts: articleDrafts,
  },
  User: {
    drafts,
  },
  Draft: {
    id: ({ id }: { id: string }) => toGlobalId({ type: 'Draft', id }),
    slug: ({ title }: { title: string }) => slugify(title),
    wordCount: ({ content }: { content?: string }) =>
      content ? countWords(content) : 0,
    summary: ({ summary, content }: { summary?: string; content: string }) =>
      summary || makeSummary(content || ''),
    cover: draftCover,
    collection,
    assets,
    article,
    circle,
  },
}
