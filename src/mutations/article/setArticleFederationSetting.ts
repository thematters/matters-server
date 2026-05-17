import type {
  Article,
  Context,
  GQLMutationResolvers,
} from '#definitions/index.js'
import type { GlobalId } from '#definitions/nominal.js'

import { NODE_TYPES, USER_FEATURE_FLAG_TYPE } from '#common/enums/index.js'
import {
  ArticleNotFoundError,
  ForbiddenError,
  UserInputError,
} from '#common/errors.js'
import { fromGlobalId, toGlobalId } from '#common/utils/index.js'

type SetArticleFederationSettingState = 'inherit' | 'enabled' | 'disabled'

const resolver = async (
  _: unknown,
  {
    input: { id, state },
  }: { input: { id: GlobalId; state: SetArticleFederationSettingState } },
  {
    viewer,
    dataSources: { articleService, federationExportService, userService },
  }: Context
) => {
  userService.validateUserState(viewer)

  const featureFlags = await userService.findFeatureFlags(viewer.id)
  const isFediverseBeta = featureFlags
    .map(({ type: featureFlagType }) => featureFlagType)
    .includes(USER_FEATURE_FLAG_TYPE.fediverseBeta)

  if (!isFediverseBeta) {
    throw new ForbiddenError('viewer is not in Fediverse beta')
  }

  const { id: articleId, type } = fromGlobalId(id)

  if (type !== NODE_TYPES.Article) {
    throw new UserInputError('id must be an Article ID')
  }

  const article = await articleService.baseFindById<Pick<Article, 'authorId'>>(
    articleId
  )

  if (!article) {
    throw new ArticleNotFoundError('Cannot find article')
  }

  if (article.authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  const updated = await federationExportService.upsertArticleFederationSetting({
    articleId,
    state,
    updatedBy: viewer.id,
  })

  return {
    ...updated,
    articleId: toGlobalId({ type: NODE_TYPES.Article, id: updated.articleId }),
    updatedBy: updated.updatedBy
      ? toGlobalId({ type: NODE_TYPES.User, id: updated.updatedBy })
      : null,
  }
}

export default resolver as GQLMutationResolvers['setArticleFederationSetting']
