import { PUBLISH_STATE } from 'common/enums'
import { correctHtml } from 'common/utils'
import { ArticleToDraftsResolver } from 'definitions'

const resolver: ArticleToDraftsResolver = async (
  { articleId },
  _,
  { knex }
) => {
  let drafts = await knex
    .from('draft')
    .where({ articleId })
    .whereIn('publish_state', [PUBLISH_STATE.published, PUBLISH_STATE.pending])
    .orderBy('created_at', 'desc')

  drafts = drafts.map((draft) => ({
    ...draft,
    content: correctHtml(draft.content),
  }))

  return drafts
}

export default resolver
