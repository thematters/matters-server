import type { GQLRecommendationResolvers } from 'definitions/index.js'

import { MATTERS_CHOICE_TOPIC_STATE } from 'common/enums/index.js'

export const icymiTopic: GQLRecommendationResolvers['icymiTopic'] = async (
  _,
  __,
  { dataSources: { atomService } }
) =>
  atomService.findFirst({
    table: 'matters_choice_topic',
    where: { state: MATTERS_CHOICE_TOPIC_STATE.published },
  })
