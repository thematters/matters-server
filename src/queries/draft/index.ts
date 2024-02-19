import type { GQLResolvers } from 'definitions'

import { makeSummary } from '@matters/ipns-site-generator'
import slugify from '@matters/slugify'

import { NODE_TYPES } from 'common/enums'
import { countWords, toGlobalId } from 'common/utils'

import * as draftAccess from './access'
import articleDrafts from './article/drafts'
import articleNewestPublishedDraft from './article/newestPublishedDraft'
import articleNewestUnpublishedDraft from './article/newestUnpublishedDraft'
import assets from './assets'
import collection from './collection'
import draftContent from './content'
import draftCover from './cover'
import drafts from './drafts'

const schema: GQLResolvers = {
  Article: {
    drafts: articleDrafts,
    newestUnpublishedDraft: articleNewestUnpublishedDraft,
    newestPublishedDraft: articleNewestPublishedDraft,
  },
  User: {
    drafts,
  },
  Draft: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Draft, id }),
    slug: ({ title }) => slugify(title),
    mediaHash: ({ mediaHash }) => mediaHash ?? '',
    wordCount: ({ content }) => (content ? countWords(content) : 0),
    summary: ({ summary, content }) => summary || makeSummary(content || ''),
    content: draftContent,
    cover: draftCover,
    collection,
    assets,
    article: (root, _, { dataSources: { atomService } }) =>
      root.articleId ? atomService.articleIdLoader.load(root.articleId) : null,
    access: (root) => root,
    license: ({ license }) => license,
  },
  DraftAccess: {
    type: ({ access }) => access,
    circle: draftAccess.circle,
  },
}

export default schema
