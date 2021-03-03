import _trim from 'lodash/trim'

import {
  ASSET_TYPE,
  CIRCLE_STATE,
  PAYMENT_CURRENCY,
  PAYMENT_MAX_DECIMAL_PLACES,
  PAYMENT_MAXIMUM_CIRCLE_AMOUNT,
  PAYMENT_MINIMAL_CIRCLE_AMOUNT,
} from 'common/enums'
import { isProd } from 'common/environment'
import {
  AssetNotFoundError,
  AuthenticationError,
  CircleNotFoundError,
  DisplayNameInvalidError,
  DuplicateCircleError,
  ForbiddenError,
  NameExistsError,
  NameInvalidError,
  PaymentAmountTooSmallError,
  PaymentReachMaximumLimitError,
  ServerError,
  UserInputError,
} from 'common/errors'
import {
  fromGlobalId,
  isValidCircleName,
  isValidDisplayName,
} from 'common/utils'
import { assetQueue } from 'connectors/queue'
import { MutationToPutCircleResolver } from 'definitions'

const INTERVAL = isProd ? 'month' : 'week'

enum ACTION {
  add = 'add',
  update = 'update',
}

const resolver: MutationToPutCircleResolver = async (
  root,
  { input: { id, avatar, cover, name, displayName, description, amount } },
  { viewer, dataSources: { atomService, paymentService, systemService }, knex }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  // check feature is enabled or not
  const feature = await systemService.getFeatureFlag('circle_management')
  if (
    feature &&
    !(await systemService.isFeatureEnabled(feature.flag, viewer))
  ) {
    throw new ForbiddenError('viewer has no permission')
  }

  const action = id ? ACTION.update : ACTION.add
  const trimedName = _trim(name)
  const trimedDisplayName = _trim(displayName)
  const trimedDescription = _trim(description)

  if (trimedName && !isValidCircleName(trimedName)) {
    throw new NameInvalidError('invalid circle name')
  }

  if (trimedDisplayName && !isValidDisplayName(trimedDisplayName, 12)) {
    throw new DisplayNameInvalidError('invalid display name')
  }

  if (trimedDescription && trimedDescription.length > 200) {
    throw new UserInputError('invalid description')
  }

  switch (action) {
    case ACTION.add: {
      // checks: valid amount, duplicate circle
      if (!trimedName || !trimedDisplayName) {
        throw new UserInputError(
          'circleName and displayName is required for creation'
        )
      }

      if (amount < PAYMENT_MINIMAL_CIRCLE_AMOUNT.HKD) {
        throw new PaymentAmountTooSmallError(
          `The minimal amount is ${PAYMENT_MINIMAL_CIRCLE_AMOUNT.HKD}`
        )
      }
      if (amount > PAYMENT_MAXIMUM_CIRCLE_AMOUNT.HKD) {
        throw new PaymentReachMaximumLimitError('payment reached maximum limit')
      }

      const places = amount % 1 ? amount.toString().split('.')[1].length : 0
      if (places > PAYMENT_MAX_DECIMAL_PLACES) {
        throw new UserInputError(
          `maximum ${PAYMENT_MAX_DECIMAL_PLACES} decimal places`
        )
      }

      const [hasCircle, sameCircle] = await Promise.all([
        atomService.count({
          table: 'circle',
          where: { owner: viewer.id, state: CIRCLE_STATE.active },
        }),
        atomService.count({
          table: 'circle',
          where: { name: trimedName },
        }),
      ])

      if (hasCircle > 0) {
        throw new ForbiddenError('already own a circle')
      }
      if (sameCircle > 0) {
        throw new NameExistsError(`duplicate circle name: ${trimedName}`)
      }

      // create a stripe product
      const stripeProduct = await paymentService.stripe.createProduct({
        name: trimedName,
        owner: viewer.id,
      })

      if (!stripeProduct) {
        throw new ServerError('cannot retrieve stripe product')
      }

      // create a stripe price
      const stripePrice = await paymentService.stripe.createPrice({
        amount,
        currency: PAYMENT_CURRENCY.HKD,
        interval: INTERVAL,
        productId: stripeProduct.id,
      })

      if (!stripePrice) {
        throw new ServerError('cannot retrieve stripe price')
      }

      const circle = await knex.transaction(async (trx) => {
        // create a matters circle
        const [record] = await trx
          .insert({
            name: trimedName,
            displayName: trimedDisplayName,
            description: trimedDescription,
            owner: viewer.id,
            providerProductId: stripeProduct.id,
          })
          .into('circle')
          .returning('*')

        // creat a matters price
        await trx
          .insert({
            amount,
            circleId: record.id,
            providerPriceId: stripePrice.id,
          })
          .into('circle_price')

        return record
      })

      return circle
    }

    case ACTION.update: {
      let data: Record<string, any> = {}
      let unusedAssetIds: string[] = []

      const { id: circleId } = fromGlobalId(id || '')
      const circle = await atomService.findFirst({
        table: 'circle',
        where: { id: circleId, owner: viewer.id, state: CIRCLE_STATE.active },
      })

      if (!circle) {
        throw new CircleNotFoundError(`Circle ${id} not found`)
      }

      // transform update paramters
      if (trimedName) {
        const sameCircle = await atomService.count({
          table: 'circle',
          where: { name: trimedName },
        })

        if (sameCircle > 0) {
          throw new DuplicateCircleError(`duplicate circle name: ${trimedName}`)
        }
        data = { ...data, name: trimedName }
      }

      if (avatar) {
        const avatarAsset = await atomService.findFirst({
          table: 'asset',
          where: { uuid: avatar },
        })

        if (
          !avatarAsset ||
          avatarAsset.type !== ASSET_TYPE.circleAvatar ||
          avatarAsset.authorId !== viewer.id
        ) {
          throw new AssetNotFoundError('circle avatar not found')
        }
        data = { ...data, avatar: avatarAsset.id }

        // store unused avatar
        if (circle.avatar) {
          unusedAssetIds = [...unusedAssetIds, circle.avatar]
        }
      }

      if (cover) {
        const coverAsset = await atomService.findFirst({
          table: 'asset',
          where: { uuid: cover },
        })

        if (
          !coverAsset ||
          coverAsset.type !== ASSET_TYPE.circleCover ||
          coverAsset.authorId !== viewer.id
        ) {
          throw new AssetNotFoundError('circle avatar not found')
        }
        data = { ...data, cover: coverAsset.id }

        // store unused cover
        if (circle.cover) {
          unusedAssetIds = [...unusedAssetIds, circle.cover]
        }
      }

      if (trimedDisplayName) {
        data = { ...data, displayName: trimedDisplayName }
      }

      if (trimedDescription) {
        data = { ...data, description: trimedDescription }
      }

      const updatedCircle = await atomService.update({
        table: 'circle',
        where: { id: circleId, state: CIRCLE_STATE.active },
        data,
      })

      // update stripe product name
      if (data.name) {
        await paymentService.stripe.updateProduct({
          id: updatedCircle.providerProductId,
          name: data.name,
        })
      }

      // TODO: move unused asset deletion into queue
      assetQueue.remove({ ids: unusedAssetIds })

      return updatedCircle
    }
  }
}

export default resolver
