abstract class Framework {
  #language = ''
  #script: string | null = null
  #region: string | null = null

  constructor(value: string) {
    this.#normalize(value.trim())
  }

  abstract get separator(): string

  #normalize(value: string) {
    if (value === '') {
      throw new Error('The value is empty.')
    }

    const [language, script, region] = value.split(this.separator)
    this.#language = this.#normalizeLanguage(language)

    if (typeof script !== 'string') {
      return
    }

    if (script.length === 4) {
      this.#script = this.#normalizeScript(script)

      if (typeof region === 'string') {
        this.#region = this.#normalizeRegion(region)
      }
    } else if (script.length === 2) {
      this.#region = this.#normalizeRegion(script)
    }
  }

  #normalizeLanguage(language: string) {
    if (language.length !== 2 && language.length !== 3) {
      throw new Error(
        'The language sub-tag does not conform to ISO 639-1 or 639-2/3.'
      )
    }

    return language.toLowerCase()
  }

  #normalizeScript(script?: string) {
    if (typeof script !== 'string') {
      return null
    }

    if (script.length !== 4) {
      return null
    }

    return script.charAt(0).toUpperCase() + script.slice(1).toLowerCase()
  }

  #normalizeRegion(region?: string) {
    if (typeof region !== 'string') {
      return null
    }

    if (region.length !== 2) {
      return null
    }

    return region.toUpperCase()
  }

  language() {
    return this.#language
  }

  script() {
    return this.#script
  }

  region() {
    return this.#region
  }

  get value() {
    let value = this.#language

    if (this.#script) {
      value += `${this.separator}${this.#script}`
    }

    if (this.#region) {
      value += `${this.separator}${this.#region}`
    }

    return value
  }
}

/**
 * Incomplete BCP 47 implementation.
 *
 * @link https://www.rfc-editor.org/rfc/bcp/bcp47.txt
 */
export class Bcp47 extends Framework {
  static from(tags: Cldr) {
    return new Bcp47(tags.value.replaceAll(tags.separator, '-'))
  }

  get separator(): string {
    return '-'
  }
}

/**
 * Incomplete CLDR implementation.
 *
 * @link https://cldr.unicode.org
 */
export class Cldr extends Framework {
  static from(tags: Bcp47) {
    return new Cldr(tags.value.replaceAll(tags.separator, '_'))
  }

  get separator(): string {
    return '_'
  }
}
