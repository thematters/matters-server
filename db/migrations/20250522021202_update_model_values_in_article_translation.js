const table = 'article_translation'

export const up = async (knex) => {
  // Delete records with leagacy models
  await knex(table)
    .whereNotIn('model', [
      'google_gemini_2_5_flash_preview',
      'google_gemini_2_0_flash_001',
      'google_translation_v2',
    ])
    .delete()

  // Update google_gemini_2_5_flash_preview to google_gemini_2_5_flash
  await knex(table)
    .where('model', 'google_gemini_2_5_flash_preview')
    .update('model', 'google_gemini_2_5_flash')

  // Update google_gemini_2_0_flash_001 to google_gemini_2_0_flash
  await knex(table)
    .where('model', 'google_gemini_2_0_flash_001')
    .update('model', 'google_gemini_2_0_flash')
}

export const down = async (knex) => {
  // Revert google_gemini_2_5_flash to google_gemini_2_5_flash_preview
  await knex(table)
    .where('model', 'google_gemini_2_5_flash')
    .update('model', 'google_gemini_2_5_flash_preview')

  // Revert google_gemini_2_0_flash to google_gemini_2_0_flash_001
  await knex(table)
    .where('model', 'google_gemini_2_0_flash')
    .update('model', 'google_gemini_2_0_flash_001')
}
