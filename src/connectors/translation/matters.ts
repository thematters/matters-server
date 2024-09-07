export interface ManageInternalLanguage {
  /**
   * Convert the Matters language code to the one supported by the translator.
   */
  toTargetLanguage(language: string): string

  /**
   * Convert the translator language code to the Matters language code.
   */
  toInternalLanguage(language: string): string
}
