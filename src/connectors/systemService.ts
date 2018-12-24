import bodybuilder from 'bodybuilder'
import { BaseService } from './baseService'
import { GQLSearchInput, GQLSearchTypes } from 'definitions'

export class SystemService extends BaseService {
  constructor() {
    super('noop')
  }

  search = async ({ key, type, limit = 10, offset = 0 }: GQLSearchInput) => {
    // TODO: handle other types
    if (type === 'Article') {
      // TODO: handle search across title and content
      const body = bodybuilder()
        .query('match', 'content', key)
        .size(limit)
        .build()
      const { hits } = await this.es.search({ index: 'article', body })
      return hits.hits
    }

    //const result = this.es.search()
  }

  /**
   * Find the url of an asset by a given id.
   */
  findAssetUrl = async (id: string): Promise<string | null> => {
    const { path } = await this.baseFindById(id, 'asset')
    return path ? `${this.aws.s3Endpoint}/${path}` : null
  }

  /**
   * Find assets by a given author id (user).
   */
  findAssetsByAuthorId = async (authorId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from('asset')
      .where({ authorId })

  /**
   * Find assets by a given author id (user) and type.
   */
  findAssetsByAuthorIdAndType = async (
    authorId: string,
    type: string
  ): Promise<any[]> =>
    await this.knex
      .select()
      .from('asset')
      .where({ authorId, type })
}
