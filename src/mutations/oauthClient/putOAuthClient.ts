import _ from 'lodash'
import { nanoid } from 'nanoid'

import { ASSET_TYPE } from 'common/enums/index.js'
import {
  AssetNotFoundError,
  AuthenticationError,
  UserInputError,
} from 'common/errors.js'
import logger from 'common/logger.js'
import { fromGlobalId } from 'common/utils/index.js'
import { MutationToPutOAuthClientResolver } from 'definitions'

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
      redirectURIs,
      user,
    },
  },
  { viewer, dataSources: { oauthService, systemService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  let oauthClient: any = {
    clientId: id || nanoid(32),
    clientSecret: secret,
    name,
    description,
    scope,
    websiteUrl: website,
    grantTypes,
    redirectUri: redirectURIs,
    userId: user ? fromGlobalId(user).id : user,
  }

  if (avatar) {
    try {
      const asset = await systemService.findAssetByUUID(avatar)
      if (
        !asset ||
        asset.type !== ASSET_TYPE.oauthClientAvatar ||
        asset.authorId !== viewer.id
      ) {
        throw new AssetNotFoundError('avatar asset does not exists')
      }
      oauthClient.avatar = asset.id
    } catch (e) {
      logger.error(`asset ${avatar} doesn't exists.`)
    }
  }

  /**
   * Create
   */
  if (!id) {
    if (!name) {
      throw new UserInputError(`"name" is required in creation`)
    }

    // client secret
    if (!secret) {
      oauthClient = {
        ...oauthClient,
        clientSecret: nanoid(64),
      }
    }

    // grant types
    if (!grantTypes) {
      oauthClient = {
        ...oauthClient,
        grantTypes: ['refresh_token', 'authorization_code'],
      }
    }
  }

  return oauthService.updateOrCreateClient(oauthClient)
}

export default resolver
