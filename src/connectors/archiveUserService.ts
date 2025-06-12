import type { Connections } from '#definitions/index.js'
import type { Knex } from 'knex'

import { ARTICLE_STATE, USER_STATE } from '#common/enums/index.js'
import { getLogger } from '#common/logger.js'

import { aws } from './aws/index.js'
import { cfsvc } from './cloudflare/index.js'

const logger = getLogger('service-archive-user')

export class ArchiveUserService {
  private knex: Knex

  public constructor(connections: Connections) {
    this.knex = connections.knex
  }

  public archiveUser = async (userId: string) => {
    const state = await this.getUserState(userId)
    if (state !== USER_STATE.archived) {
      logger.warn(`Unexpected user state: ${state} for user ${userId}`)
      return
    }
    // delete drafts
    await this.deleteDrafts(userId)

    // delete not active articles
    await this.deleteUnpulishedArticles(userId)

    // archive Moment
    await this.archiveMoment(userId)

    // delete user assets
    await this.deleteUserAssets(userId)
  }

  private getUserState = async (userId: string) => {
    const res = await this.knex('user').where('id', userId).first()
    return res.state
  }

  private deleteDrafts = async (authorId: string) => {
    const drafts = await this.findDraftByAuthor(authorId)

    // delete drafts
    await this._deleteDrafts(drafts.map((draft) => draft.id))

    // delete drafts' assets
    const draftEntityTypeId = await this.getDraftEntityTypeId()
    await Promise.all(
      drafts.map(async (draft) => {
        await this.deleteAsset({
          entityTypeId: draftEntityTypeId,
          entityId: draft.id,
        })
      })
    )
  }

  private archiveMoment = async (authorId: string) => {
    await this.knex('moment')
      .where('authorId', authorId)
      .update({ state: 'archived' })
  }

  private deleteUnpulishedArticles = async (authorId: string) =>
    this.knex('article')
      .where({ authorId })
      .whereIn('state', [ARTICLE_STATE.pending, ARTICLE_STATE.error])
      .del()

  private deleteUserAssets = async (userId: string) => {
    await this.knex('user').where('id', userId).update({
      avatar: null,
      profileCover: null,
    })
    await this.knex('oauth_client').where('user_id', userId).update({
      avatar: null,
    })
    const userEntity = await this.knex('entity_type')
      .select('id')
      .where({ table: 'user' })
      .first()
    await this.deleteAsset({ entityTypeId: userEntity.id, entityId: userId })
  }

  private getDraftEntityTypeId = async () => {
    const res = await this.knex('entity_type')
      .select('id')
      .where({ table: 'draft' })
      .first()
    return res.id
  }

  private findDraftByAuthor = (authorId: string) =>
    this.knex('draft').select().where({ authorId })

  private deleteAsset = async ({
    entityTypeId,
    entityId,
  }: {
    entityTypeId: string
    entityId: string
  }) => {
    const assetIds = await this.knex('asset_map')
      .where({ entityTypeId, entityId })
      .del()
      .returning('asset_id')

    const paths = await this.knex('asset')
      .whereIn(
        'id',
        assetIds.map(({ assetId }) => assetId)
      )
      .whereNotIn('id', this.knex('asset_map').select('asset_id'))
      .del()
      .returning('path')

    const logError = (err: Error) => logger.error('delete assets ERROR:', err)
    await Promise.allSettled(
      paths
        .map(({ path }) => [
          aws.baseDeleteFile(path).catch(logError),
          cfsvc.baseDeleteFile(path).catch(logError),
        ])
        .flat()
    )
  }

  private _deleteDrafts = async (ids: string[]) =>
    this.knex('draft').whereIn('id', ids).del()
}
