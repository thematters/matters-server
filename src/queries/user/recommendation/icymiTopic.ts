import type { GQLRecommendationResolvers } from 'definitions'

import { MATTERS_CHOICE_TOPIC_STATE } from 'common/enums'

export const icymiTopic: GQLRecommendationResolvers['icymiTopic'] = async (
  _,
  __,
  { dataSources: { atomService } }
) =>
  atomService.findFirst({
    table: 'matters_choice_topic',
    where: { state: MATTERS_CHOICE_TOPIC_STATE.published },
  })
