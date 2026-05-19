export const up = async (knex) => {
  // archive matters subscription items that still count as a circle member,
  // covering currently-in-trial, cron-failed zombie, orphan, and aged-out rows
  await knex.raw(`
    UPDATE circle_subscription_item
    SET archived = true,
        canceled_at = NOW(),
        updated_at = NOW(),
        remark = 'trial_cancel'
    WHERE id IN (
      SELECT csi.id
      FROM circle_subscription_item csi
      JOIN circle_subscription cs ON cs.id = csi.subscription_id
      WHERE csi.provider = 'matters'
        AND csi.archived = false
        AND cs.state IN ('active', 'trialing')
    )
  `)

  // cancel matters subscriptions whose items are all archived after the step above
  await knex.raw(`
    UPDATE circle_subscription
    SET state = 'canceled',
        canceled_at = NOW(),
        updated_at = NOW()
    WHERE provider = 'matters'
      AND state IN ('active', 'trialing')
      AND NOT EXISTS (
        SELECT 1
        FROM circle_subscription_item csi
        WHERE csi.subscription_id = circle_subscription.id
          AND csi.archived = false
      )
  `)
}

export const down = async () => {
  // intentional no-op: circle subscription is sunsetting, and the remark
  // 'trial_cancel' overlaps with unsubscribeCircle's existing convention,
  // so a generic reverse cannot tell migration changes from prior cancels
}
