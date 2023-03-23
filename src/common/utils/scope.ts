import { SCOPE_PREFIX } from 'common/enums/index.js'

/**
 * Check if scope is valid
 */
export const isValidScope = (scope: string) => {
  const validPrefixes = [SCOPE_PREFIX.query, SCOPE_PREFIX.mutation]

  return validPrefixes.some((prefix) => {
    const regexp = new RegExp(`^${prefix}`)
    return regexp.test(scope)
  })
}

/**
 * Check if require/request scope is allowed.
 *
 * @see {@url https://github.com/thematters/developer-resource/wiki/Scopes#scope-permission}
 */
export const isScopeAllowed = (
  scopes: string[],
  requireScope: string,
  strict: boolean = false
) => {
  return scopes.some((scope) => {
    if (!isValidScope(scope)) {
      return false
    }

    if (strict) {
      return scope === requireScope
    }

    const regexp = new RegExp(`^${scope}`)
    return regexp.test(requireScope)
  })
}
