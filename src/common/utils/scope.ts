/**
 * Check if this scope is valid.
 *
 * @see {@url https://github.com/thematters/developer-resource/wiki/Scopes#scope-permission}
 */
export const isValidScope = (
  scopes: string[],
  requireScope: string,
  strict: boolean = false
) => {
  return scopes.some((scope) => {
    if (strict) {
      return scope === requireScope
    }

    const regexp = new RegExp(`^${scope}`)
    return regexp.test(requireScope)
  })
}
