import type {
  GQLMutationResolvers,
  Campaign,
  GQLCampaignStageInput,
} from 'definitions'

import { CAMPAIGN_STATE } from 'common/enums'
import {
  UserInputError,
  CampaignNotFoundError,
  AuthenticationError,
  ActionFailedError,
} from 'common/errors'
import { fromGlobalId, isUrl, toDatetimeRangeString } from 'common/utils'

const resolver: GQLMutationResolvers['putWritingChallenge'] = async (
  _,
  {
    input: {
      id: globalId,
      name,
      description,
      link,
      cover,
      applicationPeriod,
      writingPeriod,
      state,
      stages,
    },
  },
  { viewer, dataSources: { campaignService, atomService, translationService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }
  let campaign: Campaign
  if (!globalId) {
    // create new campaign
    if (!name || !name[0].text) {
      throw new UserInputError('name is required')
    }
    if (!description || !description[0].text) {
      throw new UserInputError('description is required')
    }
    if (!cover) {
      throw new UserInputError('cover is required')
    }
    if (!link) {
      throw new UserInputError('link is required')
    }
    if (!applicationPeriod || !applicationPeriod.end) {
      throw new UserInputError('applicationPeriod is required')
    }
    if (!writingPeriod || !writingPeriod.end) {
      throw new UserInputError('writingPeriod is required')
    }
    if (!stages || !stages.length) {
      throw new UserInputError('stages is required')
    }
    const _cover = await atomService.assetUUIDLoader.load(cover)
    if (!_cover) {
      throw new UserInputError('cover not found')
    }
    if (_cover.type !== 'campaignCover') {
      throw new UserInputError('cover is not a campaign cover')
    }
    validateRange(applicationPeriod)
    validateRange(writingPeriod)
    validateUrl(link)
    validateStages(stages)

    campaign = await campaignService.createWritingChallenge({
      name: name[0].text,
      description: description[0].text,
      coverId: _cover.id,
      link,
      applicationPeriod: [applicationPeriod.start, applicationPeriod.end],
      writingPeriod: [writingPeriod.start, writingPeriod.end],
      state,
      creatorId: viewer.id,
    })
  } else {
    const { id, type } = fromGlobalId(globalId)
    if (type !== 'Campaign') {
      throw new UserInputError('wrong campaign global id')
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
    if (link) {
      validateUrl(link)
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

    const data = {
      name: name && name[0].text,
      description: description && description[0].text,
      link,
      cover: _cover?.id,
      applicationPeriod:
        applicationPeriod &&
        toDatetimeRangeString(applicationPeriod.start, applicationPeriod.end),
      writingPeriod:
        writingPeriod &&
        toDatetimeRangeString(writingPeriod.start, writingPeriod.end),
      state,
    }

    campaign = await atomService.update({
      table: 'campaign',
      where: { id },
      data,
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

  if (stages) {
    const campaiginStages = await campaignService.updateStages(
      campaign.id,
      stages.map((stage) => ({
        name: stage.name[0].text,
        period: stage.period
          ? [stage.period.start, stage.period.end]
          : undefined,
      }))
    )
    stages.forEach(async (stage, index) => {
      for (const trans of stage.name) {
        await translationService.updateOrCreateTranslation({
          table: 'campaign_stage',
          field: 'name',
          id: campaiginStages[index].id,
          language: trans.language,
          text: trans.text,
        })
      }
    })
  }

  return campaign
}

const validateRange = (range: { start: Date; end?: Date }) => {
  if (range.end && range.end.getTime() - range.start.getTime() < 0) {
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
