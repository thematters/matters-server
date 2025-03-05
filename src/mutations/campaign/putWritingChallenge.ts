import type {
  GQLMutationResolvers,
  GQLCampaignStageInput,
  Campaign,
} from 'definitions'

import { invalidateFQC } from '@matters/apollo-response-cache'

import { CAMPAIGN_STATE, NODE_TYPES } from 'common/enums'
import {
  UserInputError,
  CampaignNotFoundError,
  AuthenticationError,
  ActionFailedError,
  ArticleNotFoundError,
} from 'common/errors'
import { fromGlobalId, toDatetimeRangeString, isUrl } from 'common/utils'

const resolver: GQLMutationResolvers['putWritingChallenge'] = async (
  _,
  {
    input: {
      id: globalId,
      name,
      cover,
      link,
      announcements: announcementGlobalIds,
      applicationPeriod,
      writingPeriod,
      state,
      stages,
      featuredDescription,
    },
  },
  {
    viewer,
    dataSources: {
      campaignService,
      atomService,
      translationService,
      connections: { redis },
    },
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

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
    validateRange(applicationPeriod)
  }
  if (writingPeriod) {
    validateRange(writingPeriod)
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

  let campaign: Campaign
  if (!globalId) {
    // create new campaign
    campaign = await campaignService.createWritingChallenge({
      name: name ? name[0].text : '',
      coverId: _cover?.id,
      link,
      applicationPeriod: applicationPeriod && [
        applicationPeriod.start,
        applicationPeriod.end,
      ],
      writingPeriod: writingPeriod && [writingPeriod.start, writingPeriod.end],
      state,
      creatorId: viewer.id,
      featuredDescription: featuredDescription
        ? featuredDescription[0].text
        : '',
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

const validateRange = (range: { start: Date; end?: Date }) => {
  if (range.end && range.end.getTime() - range.start.getTime() <= 0) {
    throw new UserInputError('start date must be earlier than end date')
  }
}

const validateStages = (stages: GQLCampaignStageInput[]) => {
  for (const stage of stages) {
    if (!stage.name || !stage.name[0].text) {
      throw new UserInputError('stage name is required')
    }
    if (stage.period) {
      validateRange(stage.period)
    }
  }
}

const validateUrl = (url: string) => {
  if (!isUrl(url)) {
    throw new UserInputError('invalid url')
  }
}

export default resolver
