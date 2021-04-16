exports.up = async (knex) => {
  await knex.raw(`
    UPDATE
      circle_subscription_item
    SET
      archived = TRUE
    FROM (
      SELECT
        circle_subscription_item.*
      FROM
        circle_subscription
      RIGHT JOIN circle_subscription_item ON circle_subscription_item.subscription_id = circle_subscription.id
      WHERE
        "state" = 'canceled' and archived = FALSE) AS canceled_sub_item
    WHERE
      circle_subscription_item.id = canceled_sub_item.id
  `)
}

exports.down = () => {}
