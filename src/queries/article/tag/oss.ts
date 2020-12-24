import {
  TagOSSToBoostResolver,
  TagOSSToScoreResolver,
  TagOSSToSelectedResolver,
} from 'definitions'

export const boost: TagOSSToBoostResolver = (
  { id },
  _,
  { dataSources: { tagService } }
) => tagService.findBoost(id)

export const score: TagOSSToScoreResolver = (
  { id },
  _,
  { dataSources: { tagService } }
) => tagService.findScore(id)

export const selected: TagOSSToSelectedResolver = async (
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
