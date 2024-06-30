# set -xe

# export PATH="/home/ec2-user/.nvm/versions/node/v12.16.2/bin:$PATH"
# started="$(node -p 'new Date')"

# set some default
: ${PSQL:="psql -h matters-analytics.xxxx.rds.amazonaws.com -d xxx -U postgres -w"}

date="$(date '+%Y%m%d')"

if [ $(date '+%u') = 1 ]; then
	EXPIRING_TS="expiring at $(date --date='+3 month' '+%Y-%m-%d')"
fi

# try create index(es) for query performance;
# find a way to run this only on AnalyticsDB
# ${ECHO:+:} ${PSQL} --echo-all --pset pager -c '\timing' --file=./sql/create-indexes.sql

UPDATING_TS="Create text search configuration started at ${started}"
${ECHO:+:} ${PSQL} --echo-all --pset pager -c '\timing' \
       -v schemaname=search_index \
       -v comment="'schemaname=search_index created ${date}: ${UPDATING_TS}; ${EXPIRING_TS}'" \
       --file=./sql/create-schema-grant-all-select.sql

UPDATING_TS="Create text search configuration started at ${started}"
${ECHO:+:} ${PSQL} --echo-all --pset pager -c '\timing' \
	-v ON_ERROR_STOP=on \
	--file=./sql/create-table-search-index-parser.sql

UPDATING_TS="Create tablename=search_index.article started at ${started}"
${ECHO:+:} ${PSQL} --echo-all --pset pager -c '\timing' \
	-v ON_ERROR_STOP=on \
	-v schemaname=search_index \
	-v comment="'alias tablename=search_index.article: ${UPDATING_TS}'" \
	--file=./sql/create-table-search-index-article.sql

UPDATING_TS="Create tablename=search_index.user started at ${started}"
${ECHO:+:} ${PSQL} --echo-all --pset pager -c '\timing' \
	-v ON_ERROR_STOP=on \
	-v schemaname=search_index \
	-v comment="'alias tablename=search_index.user: ${UPDATING_TS}'" \
	--file=./sql/create-table-search-index-user.sql

UPDATING_TS="Create tablename=search_index.tag started at ${started}"
${ECHO:+:} ${PSQL} --echo-all --pset pager -c '\timing' \
	-v ON_ERROR_STOP=on \
	-v schemaname=search_index \
	-v comment="'alias tablename=search_index.tag: ${UPDATING_TS}'" \
	--file=./sql/create-table-search-index-tag.sql
