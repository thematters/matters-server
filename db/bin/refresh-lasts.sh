
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
# ${ECHO:+:} time ${PSQL} --echo-all --pset pager -c '\timing' --file=./sql/create-indexes.sql

${ECHO:+:} time ${PSQL} --echo-all --pset pager -c '\timing' \
	-v schemaname=mat_views \
	-v comment="'schemaname=mat_views created ${date}: ${UPDATING_TS}; ${EXPIRING_TS}'" \
	--file=./sql/create-schema-grant-all-select.sql

started="$(date '+%Y-%m-%dT%H:%M:%S.%NZ')"
UPDATING_TS="updating started at ${started}"
EXPIRING_TS="expiring at $(date --date='next month' '+%Y-%m-%d')"
${ECHO:+:} time ${PSQL} --echo-all --pset pager -c '\timing' \
	-v ON_ERROR_STOP=on \
	-v schema=mat_views -v tablename="authors_lasts_${date}" \
	-v comment="'alias tablename=authors_lasts_${date}: ${UPDATING_TS}; ${EXPIRING_TS}'" \
	--file=./sql/author-tags-create-table-view.sql

started="$(date '+%Y-%m-%dT%H:%M:%S.%NZ')"
UPDATING_TS="updating started at ${started}"
EXPIRING_TS="expiring at $(date --date='next month' '+%Y-%m-%d')"
${ECHO:+:} time ${PSQL} --echo-all --pset pager -c '\timing' \
	-v ON_ERROR_STOP=on \
	-v schema=mat_views -v tablename="circles_lasts_${date}" \
	-v comment="'alias tablename=circles_lasts_${date}: ${UPDATING_TS}; ${EXPIRING_TS}'" \
	--file=./sql/stale-circles-create-table-view.sql

started="$(date '+%Y-%m-%dT%H:%M:%S.%NZ')"
UPDATING_TS="updating started at ${started}"
EXPIRING_TS="expiring at $(date --date='next month' '+%Y-%m-%d')"
${ECHO:+:} time ${PSQL} --echo-all --pset pager -c '\timing' \
	-v ON_ERROR_STOP=on \
	-v schema=mat_views -v tablename="tags_lasts_${date}" \
	-v comment="'alias tablename=tags_lasts_${date}: ${UPDATING_TS}; ${EXPIRING_TS}'" \
	--file=./sql/stale-tags-create-table-view.sql

started="$(date '+%Y-%m-%dT%H:%M:%S.%NZ')"
UPDATING_TS="updating started at ${started}"
EXPIRING_TS="expiring at $(date --date='next month' '+%Y-%m-%d')"
${ECHO:+:} time ${PSQL} --echo-all --pset pager -c '\timing' \
	-v ON_ERROR_STOP=on \
	-v schema=mat_views -v tablename="users_lasts_${date}" \
	-v comment="'alias tablename=users_lasts_${date}: ${UPDATING_TS}; ${EXPIRING_TS}'" \
	--file=./sql/stale-users-create-table-view.sql

echo "updated done: $(date -R)"
