export const USER_ROLE = {
  admin: 'admin',
  user: 'user',
  visitor: 'visitor',
}

/**
 * auth mode is "oauth" if the viewer access token is signed via OAuth,
 * otherwise, it's `viewer.role`
 */
export const AUTH_MODE = {
  visitor: 'visitor',
  oauth: 'oauth',
  user: 'user',
  admin: 'admin',
}

/**
 * Scope grouping for mutation
 *
 * @see {@url https://github.com/thematters/developer-resource/wiki/Scopes#mutation}
 */
export const SCOPE_GROUP = {
  level1: 'level1',
  level2: 'level2',
  level3: 'level3',
}

export const SCOPE_PREFIX = {
  query: 'query:viewer',
  mutation: 'mutation',
}
