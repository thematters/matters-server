export interface ClassificationService {
  classify(contentId: string, variationIds?: string[]): Promise<void>
}

export class Service implements ClassificationService {
  async classify(contentId: string, variationIds?: string[]) {
    //
  }
}
