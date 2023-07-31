import {
  TagOSSToBoostResolver,
  TagOSSToScoreResolver,
  TagOSSToSelectedResolver,
} from 'definitions'

export const boost: GQLTagOSSResolvers['boost'] = (
  { id },
  _,
  { dataSources: { tagService } }
) => tagService.findBoost(id)

export const score: GQLTagOSSResolvers['score'] = (
  { id },
  _,
  { dataSources: { tagService } }
) => tagService.findScore(id)

export const selected: GQLTagOSSResolvers['selected'] = async (
  { id },
  _,
  { dataSources: { tagService } }
) => {
  const result = await tagService.knex
    .from('matters_choice_tag')
    .where({ tagId: id })
    .count()
    .first()

  return parseInt(result ? (result.count as string) : '0', 10) > 0
}
