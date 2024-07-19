import type {
  GQLMutationResolvers,
  GQLCampaignStageInput,
  Campaign,
} from 'definitions'

import {
  normalizeCampaignHTML,
  sanitizeHTML,
} from '@matters/matters-editor/transformers'

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

  let campaign: Campaign
  if (!globalId) {
    // create new campaign
    campaign = await campaignService.createWritingChallenge({
      name: name ? name[0].text : '',
      description: description
        ? normalizeCampaignHTML(sanitizeHTML(description[0].text))
        : '',
      coverId: _cover?.id,
      link: link ? link : '',
      applicationPeriod: applicationPeriod && [
        applicationPeriod.start,
        applicationPeriod.end,
      ],
      writingPeriod: writingPeriod && [writingPeriod.start, writingPeriod.end],
      state,
      creatorId: viewer.id,
    })
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

    const data = {
      name: name && name[0].text,
      description:
        description && normalizeCampaignHTML(sanitizeHTML(description[0].text)),
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
        text: normalizeCampaignHTML(sanitizeHTML(trans.text)),
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
