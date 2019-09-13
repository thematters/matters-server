import _ from 'lodash'
import nanoid from 'nanoid'

import { MutationToPutOAuthClientResolver, GQLGrantType } from 'definitions'
import { AuthenticationError, UserInputError } from 'common/errors'

const resolver: MutationToPutOAuthClientResolver = async (
  root,
  {
    input: {
      id,
      secret,
      name,
      description,
      avatar,
      scope,
      grantTypes,
      website,
      redirectURIs
    }
  },
  { viewer, dataSources: { oauthService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  let oauthClient = {
    clientId: id,
    clientSecret: secret,
    name,
    description,
    avatar,
    scope,
    grantTypes,
    websiteUrl: website,
    redirectUri: redirectURIs
  }

  /**
   * Create
   */
  if (!id) {
    if (!name) {
      throw new UserInputError(`"name" is required in creation`)
    }

    // client id
    oauthClient = {
      ...oauthClient,
      clientId: nanoid(32)
    }

    // client secret
    if (!secret) {
      oauthClient = {
        ...oauthClient,
        clientSecret: nanoid(64)
      }
    }

    // grant types
    if (!grantTypes) {
      oauthClient = {
        ...oauthClient,
        grantTypes: [
          GQLGrantType.refresh_token,
          GQLGrantType.authorization_code
        ]
      }
    }
  }

  // @ts-ignore
  const newOAuthClient = await oauthService.updateOrCreateClient(oauthClient)

  console.log(newOAuthClient)
  return newOAuthClient
}

export default resolver
