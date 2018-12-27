module.exports = async () => {
  await global.knex.destroy()
}
