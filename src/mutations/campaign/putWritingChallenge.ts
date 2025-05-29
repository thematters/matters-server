import type {
  GQLMutationResolvers,
  GQLCampaignStageInput,
  Campaign,
} from '#definitions/index.js'

import { CAMPAIGN_STATE, NODE_TYPES } from '#common/enums/index.js'
import {
  UserInputError,
  CampaignNotFoundError,
  ActionFailedError,
  ArticleNotFoundError,
} from '#common/errors.js'
import {
  fromGlobalId,
  toDatetimeRangeString,
  isValidDatetimeRange,
  isUrl,
} from '#common/utils/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'

const resolver: GQLMutationResolvers['putWritingChallenge'] = async (
  _,
  {
    input: {
      id: globalId,
      name,
      cover,
      description,
      link,
      announcements: announcementGlobalIds,
      applicationPeriod,
      writingPeriod,
      state,
      stages,
      featuredDescription,
      channelEnabled,
      exclusive,
      managers: managerGlobalIds,
    },
  },
  {
    viewer,
    dataSources: {
      campaignService,
      atomService,
      translationService,
      channelService,
      connections: { redis },
    },
  }
) => {
  let _cover: { id: string; type: string } | undefined = undefined
  if (cover) {
    _cover = await atomService.assetUUIDLoader.load(cover)
    if (!_cover) {
      throw new UserInputError('cover not found')
    }
    if (_cover.type !== 'campaignCover') {
      throw new UserInputError('cover is not a campaign cover')
    }
  }

  if (link) {
    validateUrl(link)
  }
  if (applicationPeriod) {
    if (!isValidDatetimeRange(applicationPeriod)) {
      throw new UserInputError('invalid datetime range')
    }
  }
  if (writingPeriod) {
    if (!isValidDatetimeRange(writingPeriod)) {
      throw new UserInputError('invalid datetime range')
    }
  }
  if (stages) {
    validateStages(stages)
  }

  let announcementIds: string[] = []
  if (announcementGlobalIds && announcementGlobalIds.length > 0) {
    announcementIds = announcementGlobalIds.map((id) => fromGlobalId(id).id)
    for (const announcementId of announcementIds) {
      const announcement = await atomService.articleIdLoader.load(
        announcementId
      )
      if (!announcement) {
        throw new ArticleNotFoundError('Announcement article not found')
      }
    }
  }

  let managerIds: string[] = []
  if (managerGlobalIds && managerGlobalIds.length > 0) {
    managerIds = managerGlobalIds.map((id) => fromGlobalId(id).id)

    for (const userId of managerIds) {
      const user = await atomService.userIdLoader.load(userId)
      if (!user) {
        throw new UserInputError(`User with ID ${userId} not found`)
      }
    }
  }

  let campaign: Campaign
  if (!globalId) {
    // create new campaign
    campaign = await campaignService.createWritingChallenge({
      name: name ? name[0].text : '',
      description: description ? description[0].text : '',
      coverId: _cover?.id,
      link,
      applicationPeriod: applicationPeriod && [
        applicationPeriod.start,
        applicationPeriod.end,
      ],
      writingPeriod: writingPeriod && [writingPeriod.start, writingPeriod.end],
      state,
      creatorId: viewer.id,
      managerIds,
      featuredDescription: featuredDescription
        ? featuredDescription[0].text
        : '',
      exclusive,
    })

    // invalidate campaign list cache
    if (+campaign.id > 1) {
      invalidateFQC({
        node: { type: NODE_TYPES.Campaign, id: `${+campaign.id - 1}` },
        redis,
      })
    }
  } else {
    const { id, type } = fromGlobalId(globalId)
    if (type !== 'Campaign') {
      throw new UserInputError('wrong campaign global id')
    }
    campaign = await atomService.findUnique({
      table: 'campaign',
      where: { id },
    })
    if (!campaign) {
      throw new CampaignNotFoundError('campaign not found')
    }

    if (
      stages &&
      [
        CAMPAIGN_STATE.active as string,
        CAMPAIGN_STATE.finished as string,
      ].includes(campaign.state)
    ) {
      throw new ActionFailedError(
        'cannot update stages when campaign is active or finished'
      )
    }

    if (state === CAMPAIGN_STATE.pending) {
      throw new UserInputError('cannot update state to pending')
    }

    const data = {
      name: name && name[0].text,
      cover: _cover?.id,
      link,
      applicationPeriod:
        applicationPeriod &&
        toDatetimeRangeString(applicationPeriod.start, applicationPeriod.end),
      writingPeriod:
        writingPeriod &&
        toDatetimeRangeString(writingPeriod.start, writingPeriod.end),
      state,
      featuredDescription: featuredDescription && featuredDescription[0].text,
      managerIds,
      exclusive,
    }

    campaign = await atomService.update({
      table: 'campaign',
      where: { id },
      data,
    })
  }

  if (announcementGlobalIds !== undefined) {
    await campaignService.updateAnnouncements(
      campaign.id,
      announcementIds ?? []
    )

    await Promise.all(
      announcementIds.map((articleId) =>
        invalidateFQC({
          node: { type: NODE_TYPES.Article, id: articleId },
          redis,
        })
      )
    )
  }

  // create or update campaign channel
  if (channelEnabled !== undefined) {
    if (
      [
        CAMPAIGN_STATE.pending as string,
        CAMPAIGN_STATE.archived as string,
      ].includes(campaign.state) &&
      channelEnabled
    ) {
      throw new ActionFailedError(
        'Cannot enable channel when campaign is pending or archived'
      )
    }

    await channelService.updateOrCreateCampaignChannel({
      campaignId: campaign.id,
      enabled: channelEnabled,
    })
  }

  // create or update translations
  if (name) {
    for (const trans of name) {
      await translationService.updateOrCreateTranslation({
        table: 'campaign',
        field: 'name',
        id: campaign.id,
        language: trans.language,
        text: trans.text,
      })
    }
  }

  if (description) {
    for (const trans of description) {
      await translationService.updateOrCreateTranslation({
        table: 'campaign',
        field: 'description',
        id: campaign.id,
        language: trans.language,
        text: trans.text,
      })
    }
  }

  if (featuredDescription) {
    for (const trans of featuredDescription) {
      await translationService.updateOrCreateTranslation({
        table: 'campaign',
        field: 'featured_description',
        id: campaign.id,
        language: trans.language,
        text: trans.text,
      })
    }
  }

  if (stages) {
    const campaiginStages = await campaignService.updateStages(
      campaign.id,
      stages.map((stage) => ({
        name: stage.name[0].text,
        description:
          stage.description && stage.description.length > 0
            ? stage.description[0].text
            : '',
        period: stage.period
          ? [stage.period.start, stage.period.end]
          : undefined,
      }))
    )
    await Promise.all(
      stages.map(async (stage, index) => {
        for (const trans of stage.name) {
          await translationService.updateOrCreateTranslation({
            table: 'campaign_stage',
            field: 'name',
            id: campaiginStages[index].id,
            language: trans.language,
            text: trans.text,
          })
        }
        if (stage.description && stage.description.length > 0) {
          for (const trans of stage.description) {
            await translationService.updateOrCreateTranslation({
              table: 'campaign_stage',
              field: 'description',
              id: campaiginStages[index].id,
              language: trans.language,
              text: trans.text,
            })
          }
        }
      })
    )
  }

  return campaign
}

const validateStages = (stages: GQLCampaignStageInput[]) => {
  for (const stage of stages) {
    if (!stage.name || !stage.name[0].text) {
      throw new UserInputError('stage name is required')
    }
    if (stage.period) {
      if (!isValidDatetimeRange(stage.period)) {
        throw new UserInputError('invalid datetime range')
      }
    }
  }
}

const validateUrl = (url: string) => {
  if (!isUrl(url)) {
    throw new UserInputError('invalid url')
  }
}

export default resolver
