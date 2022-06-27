export enum VIEW {
  tag_count_view = 'tag_count_view',
  user_reader_view = 'user_reader_view',
  article_count_view = 'article_count_view',
  article_hottest_view = 'article_hottest_view',
  transaction_delta_view = 'transaction_delta_view',
  article_value_view = 'article_value_view',
  tags_lasts_view = 'mat_views.tags_lasts',
  authors_lasts_view = 'mat_views.authors_lasts',
}

export enum MATERIALIZED_VIEW {
  tag_count_materialized = 'tag_count_materialized',
  user_reader_materialized = 'user_reader_materialized',
  featured_comment_materialized = 'featured_comment_materialized',
  curation_tag_materialized = 'curation_tag_materialized',
  article_hottest_materialized = 'article_hottest_materialized',
  most_active_author_materialized = 'most_active_author_materialized',
  most_appreciated_author_materialized = 'most_appreciated_author_materialized',
  most_trendy_author_materialized = 'most_trendy_author_materialized',
  user_activity_materialized = 'user_activity_materialized',
  recently_read_tags_materialized = 'recently_read_tags_materialized',
  article_read_time_materialized = 'article_read_time_materialized',
  recommended_articles_from_read_tags_materialized = 'recommended_articles_from_read_tags_materialized',
}
