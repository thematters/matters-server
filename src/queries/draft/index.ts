import { makeSummary } from '@matters/ipns-site-generator'
import slugify from '@matters/slugify'

import { ARTICLE_LICENSE_TYPE, NODE_TYPES } from 'common/enums/index.js'
import { countWords, toGlobalId } from 'common/utils/index.js'

import * as draftAccess from './access/index.js'
import articleDrafts from './article/drafts.js'
import assets from './assets.js'
import collection from './collection.js'
import draftContent from './content.js'
import draftCover from './cover.js'
import drafts from './drafts.js'

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
    mediaHash: ({ mediaHash }: { mediaHash: string }) => mediaHash || '',
    wordCount: ({ content }: { content?: string }) =>
      content ? countWords(content) : 0,
    summary: ({ summary, content }: { summary?: string; content: string }) =>
      summary || makeSummary(content || ''),
    content: draftContent,
    cover: draftCover,
    collection,
    assets,
    article: (root: any) => root,
    access: (root: any) => root,
    license: ({ license }: { license: any }) =>
      license || ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2,
  },
  DraftAccess: {
    type: ({ access }: { access: string }) => access,
    circle: draftAccess.circle,
  },
}
