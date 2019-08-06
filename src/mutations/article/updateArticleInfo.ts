import { MutationToUpdateArticleInfoResolver } from 'definitions'
import { isEmpty } from 'lodash'

import { fromGlobalId } from 'common/utils'
import {
  AuthenticationError,
  ArticleNotFoundError,
  ForbiddenError,
  UserInputError
} from 'common/errors'

const resolver: MutationToUpdateArticleInfoResolver = async (
  _,
  { input: { id, sticky } },
  { viewer, dataSources: { articleService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new ArticleNotFoundError('target article does not exist')
  }
  if (article.authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  const params: { [key: string]: any } = {}
  if (typeof sticky === 'boolean') {
    params.sticky = sticky

    // Reset if there are some sticky articles.
    if (sticky === true) {
      const stickyIds = (await articleService.findBySticky(
        viewer.id,
        true
      )).map(({ id }) => id)
      await Promise.all(
        stickyIds.map(id =>
          articleService.baseUpdate(id, {
            sticky: false,
            updatedAt: new Date()
          })
        )
      )
    }
  }

  if (isEmpty(params)) {
    throw new UserInputError('bad request')
  }

  return articleService.baseUpdate(dbId, {
    ...params,
    updatedAt: new Date()
  })
}

export default resolver
