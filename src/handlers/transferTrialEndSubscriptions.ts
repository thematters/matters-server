import { PaymentService } from '#connectors/paymentService.js'

import { connections } from '../connections.js'

const paymentService = new PaymentService(connections)

export const handler = async () =>
  paymentService.transferTrialEndSubscriptions()
