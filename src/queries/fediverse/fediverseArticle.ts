import type { Context, GlobalId } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import {
  ArticleNotFoundError,
  ForbiddenError,
  UserInputError,
} from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'
import { buildMattersArticleUrl } from '#connectors/article/federationExportService.js'

import { assertFediverseViewer } from './utils.js'

const resolver = async (
  _: unknown,
  { input: { id } }: { input: { id: GlobalId } },
  { viewer, dataSources: { federationExportService, userService } }: Context
) => {
  const { actorHandle } = await assertFediverseViewer({
    viewer,
    userService,
    federationExportService,
  })
  const decoded = fromGlobalId(id)
  if (decoded.type !== NODE_TYPES.Article) {
    throw new UserInputError('id must identify an article')
  }
  const [row] = await federationExportService.loadSelectedArticleRows([
    decoded.id,
  ])
  if (!row) {
    throw new ArticleNotFoundError('article not found')
  }
  if (row.author.id !== viewer.id) {
    throw new ForbiddenError('Only the author can view Fediverse interactions')
  }
  const contentRef = buildMattersArticleUrl({
    siteDomain: environment.siteDomain,
    articleId: row.articleId,
    shortHash: row.shortHash,
  })
  return federationExportService.loadArticleSocial({
    actorHandle,
    contentRef,
  })
}

export default resolver
