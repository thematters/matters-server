import type { GQLResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { countWords, toGlobalId } from '#common/utils/index.js'
import { makeSummary } from '@matters/ipns-site-generator'
import slugify from '@matters/slugify'

import * as draftAccess from './access/index.js'
import assets from './assets.js'
import campaigns from './campaigns.js'
import collection from './collection.js'
import draftContent from './content.js'
import draftCover from './cover.js'
import drafts from './drafts.js'

const schema: GQLResolvers = {
  User: {
    drafts,
  },
  Draft: {
    id: ({ id }) => toGlobalId({ type: NODE_TYPES.Draft, id }),
    slug: ({ title }) => slugify(title),
    mediaHash: ({ mediaHash }) => mediaHash ?? '',
    wordCount: ({ content }) => (content ? countWords(content) : 0),
    summary: ({ summary, content }) => summary || makeSummary(content || ''),
    summaryCustomized: ({ summary }) => !!summary,
    content: draftContent,
    cover: draftCover,
    collection,
    assets,
    article: (root, _, { dataSources: { atomService } }) =>
      root.articleId ? atomService.articleIdLoader.load(root.articleId) : null,
    access: (root) => root,
    license: ({ license }) => license,
    indentFirstLine: ({ indentFirstLine }) => indentFirstLine,
    campaigns,
  },
  DraftAccess: {
    type: ({ access }) => access,
    circle: draftAccess.circle,
  },
}

export default schema
