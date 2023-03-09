module.exports = async () => {
  await global.knex.migrate.rollback()
  await global.knex.destroy()
}
