const table = 'transaction'

exports.seed = function(knex, Promise) {
  // Deletes ALL existing entries
  return knex(table)
    .del()
    .then(function() {
      // Inserts seed entries
      return knex(table).insert([
        { sender_id: 1, amount: 10, reference_id: 1, recipient_id: 1 },
        { sender_id: 1, amount: 10, reference_id: 1, recipient_id: 1 },
        { sender_id: 2, amount: 30, reference_id: 1, recipient_id: 1 },
        { sender_id: 2, amount: 10, reference_id: 2, recipient_id: 2 },
        { sender_id: 3, amount: 50, reference_id: 3, recipient_id: 3 },
        { sender_id: 3, amount: 100, reference_id: 1, recipient_id: 1 }
      ])
    })
}
