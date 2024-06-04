import type { User, Connections } from 'definitions'
// import type { Knex } from 'knex'

import { USER_STATE, JOURNAL_STATE } from 'common/enums'
import { ForbiddenError, ForbiddenByStateError } from 'common/errors'
import { AtomService } from 'connectors'

type Actor = Pick<User, 'id' | 'state'>

export class JournalService {
  // private connections: Connections
  // private knex: Knex
  // private knexRO: Knex
  private models: AtomService

  public constructor(connections: Connections) {
    // this.connections = connections
    // this.knex = connections.knex
    // this.knexRO = connections.knexRO
    this.models = new AtomService(connections)
  }

  public create = async (
    data: { content: string; assetIds: string[] },
    actor: Actor
  ) => {
    if (actor.state !== USER_STATE.active) {
      throw new ForbiddenByStateError(
        `${actor.state} user is not allowed to create journal`
      )
    }
    const journal = await this.models.create({
      table: 'journal',
      data: {
        authorId: actor.id,
        content: data.content,
        state: JOURNAL_STATE.active,
      },
    })
    if (data.assetIds.length > 0) {
      await Promise.all(
        data.assetIds.map((assetId) =>
          this.models.create({
            table: 'journal_asset',
            data: { assetId, journalId: journal.id },
          })
        )
      )
    }
    return journal
  }

  public delete = async (id: string, actor: Actor) => {
    if (actor.state !== USER_STATE.active) {
      throw new ForbiddenByStateError(
        `${actor.state} user is not allowed to delete journal`
      )
    }
    const journal = await this.models.journalIdLoader.load(id)
    if (journal.authorId !== actor.id) {
      throw new ForbiddenError(
        `journal ${id} is not created by user ${actor.id}`
      )
    }
    return this.models.update({
      table: 'journal',
      where: { id, authorId: actor.id },
      data: { state: JOURNAL_STATE.archived },
    })
  }
}
