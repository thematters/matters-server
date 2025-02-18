import type { GQLMutationResolvers } from 'definitions'

import { CAMPAIGN_USER_STATE, LANGUAGE, NOTICE_TYPE } from 'common/enums'
import {
  AuthenticationError,
  UserInputError,
  CampaignNotFoundError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['sendCampaignAnnouncement'] = async (
  _,
  { input: { campaign: campaignGlobalId, announcement, link, password } },
  { viewer, dataSources: { userService, atomService, notificationService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  // validate password
  if (!password) {
    throw new UserInputError('`password` is required')
  } else {
    await userService.verifyPassword({ password, hash: viewer.passwordHash })
  }

  // validate campaign
  const { type: campaignType, id: campaignId } = fromGlobalId(campaignGlobalId)

  if (campaignType !== 'Campaign' || !campaignId) {
    throw new UserInputError('invalid campaign id')
  }

  const campaign = await atomService.findUnique({
    table: 'campaign',
    where: { id: campaignId },
  })

  if (!campaign) {
    throw new CampaignNotFoundError('campaign not found')
  }

  const participantIds = await atomService.findMany({
    table: 'campaign_user',
    where: { campaignId, state: CAMPAIGN_USER_STATE.succeeded },
  })
  const participants = await atomService.findMany({
    table: 'user',
    whereIn: ['id', participantIds.map(({ userId }) => userId)],
  })

  const announcementTranslations = {
    [LANGUAGE.zh_hans]: '',
    [LANGUAGE.zh_hant]: '',
    [LANGUAGE.en]: '',
  }
  for (const trans of announcement) {
    const { language, text } = trans
    if (language === LANGUAGE.zh_hans) {
      announcementTranslations[LANGUAGE.zh_hans] = text
    } else if (language === LANGUAGE.zh_hant) {
      announcementTranslations[LANGUAGE.zh_hant] = text
    } else {
      announcementTranslations[LANGUAGE.en] = text
    }
  }

  // send notification to users
  for (const participant of participants) {
    notificationService.trigger({
      event: NOTICE_TYPE.official_announcement,
      recipientId: participant.id,
      message: announcementTranslations[participant.language],
      data: { link },
    })
  }

  return true
}

export default resolver
