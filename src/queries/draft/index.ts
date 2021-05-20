import { makeSummary } from '@matters/matters-html-formatter'
import slugify from '@matters/slugify'

import { NODE_TYPES } from 'common/enums'
import { countWords, toGlobalId } from 'common/utils'

import * as draftAccess from './access'
import article from './article'
import articleDrafts from './article/drafts'
import assets from './assets'
import circle from './circle'
import collection from './collection'
import draftContent from './content'
import draftCover from './cover'
import drafts from './drafts'
import license from './license'

export default {
  Article: {
    drafts: articleDrafts,
  },
  User: {
    drafts,
  },
  Draft: {
    id: ({ id }: { id: string }) => toGlobalId({ type: NODE_TYPES.Draft, id }),
    slug: ({ title }: { title: string }) => slugify(title),
    wordCount: ({ content }: { content?: string }) =>
      content ? countWords(content) : 0,
    summary: ({ summary, content }: { summary?: string; content: string }) =>
      summary || makeSummary(content || ''),
    content: draftContent,
    cover: draftCover,
    collection,
    assets,
    article,
    circle,
    access: (root: any) => root,
    license,
  },
  DraftAccess: {
    type: ({ access }: { access: string }) => access,
    circle: draftAccess.circle,
  },
}
