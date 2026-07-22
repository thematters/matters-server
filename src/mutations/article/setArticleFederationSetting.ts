import type {
  Article,
  Context,
  GQLMutationResolvers,
} from '#definitions/index.js'
import type { GlobalId } from '#definitions/nominal.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import {
  ArticleNotFoundError,
  ForbiddenError,
  UserInputError,
} from '#common/errors.js'
import { fromGlobalId, toGlobalId } from '#common/utils/index.js'
import {
  FEDERATION_ARTICLE_SETTING,
  FEDERATION_EXPORT_ACTION,
  FEDERATION_EXPORT_TRIGGER,
  FEDERATION_EXPORT_TRIGGER_MODE,
} from '#connectors/article/federationExportService.js'

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

  if (
    environment.federationExportTriggerMode ===
    FEDERATION_EXPORT_TRIGGER_MODE.sqs
  ) {
    await federationExportService.recordExportTriggerDecision({
      articleId,
      actorId: viewer.id,
      trigger: FEDERATION_EXPORT_TRIGGER.settingChange,
      mode: FEDERATION_EXPORT_TRIGGER_MODE.sqs,
      action:
        state === FEDERATION_ARTICLE_SETTING.disabled
          ? FEDERATION_EXPORT_ACTION.delete
          : FEDERATION_EXPORT_ACTION.update,
    })
  }

  return {
    ...updated,
    articleId: toGlobalId({ type: NODE_TYPES.Article, id: updated.articleId }),
    updatedBy: updated.updatedBy
      ? toGlobalId({ type: NODE_TYPES.User, id: updated.updatedBy })
      : null,
  }
}

export default resolver as GQLMutationResolvers['setArticleFederationSetting']
