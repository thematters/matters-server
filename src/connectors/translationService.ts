import type { Connections, TableName, LANGUAGES } from 'definitions'

import { AtomService, SystemService } from 'connectors'

export class TranslationService {
  private connections: Connections
  private models: AtomService

  public constructor(connections: Connections) {
    this.connections = connections
    this.models = new AtomService(connections)
  }

  public updateOrCreateTranslation = async ({
    table,
    field,
    id,
    language,
    text,
  }: {
    table: TableName
    field: string
    id: string
    language: LANGUAGES
    text: string
  }) => {
    const systemService = new SystemService(this.connections)
    const { id: entityTypeId } = await systemService.baseFindEntityTypeId(table)
    const [translation] = await this.models.findMany({
      table: 'translation',
      where: {
        entityTypeId,
        entityField: field,
        entityId: id,
        language,
      },
    })

    if (translation) {
      return this.models.update({
        table: 'translation',
        where: { id: translation.id },
        data: { text },
      })
    }

    return this.models.create({
      table: 'translation',
      data: {
        entityTypeId,
        entityField: field,
        entityId: id,
        language,
        text,
      },
    })
  }

  public findTranslation = async ({
    table,
    field,
    id,
    language,
  }: {
    table: TableName
    field: string
    language: LANGUAGES
    id: string
  }) => {
    const systemService = new SystemService(this.connections)
    const { id: entityTypeId } = await systemService.baseFindEntityTypeId(table)
    const [translation] = await this.models.findMany({
      table: 'translation',
      where: {
        entityTypeId,
        entityField: field,
        entityId: id,
        language,
      },
    })
    return translation
  }
}
