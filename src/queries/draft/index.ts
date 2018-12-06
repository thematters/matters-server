import { Context } from 'definitions'

export default {
  Query: {
    draft: (
      _: any,
      { uuid }: { uuid: string },
      { draftService } :Context
    ) => draftService.uuidLoader.load(uuid)
  }
}
