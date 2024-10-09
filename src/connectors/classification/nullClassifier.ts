import { Classification, Classifier } from './manager'

export class NullClassifier implements Classifier {
  async classify(_content: string): Promise<Classification | null> {
    return null
  }
}
