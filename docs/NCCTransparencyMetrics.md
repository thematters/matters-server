# NCC Transparency Metrics Export

This export produces aggregated moderation and Community Watch metrics for a
fixed reporting period. It is intended for transparency report drafting and
review, not for public case-level disclosure.

## Usage

Build the server first, then run the export command with an inclusive date
range.

Make sure the usual `MATTERS_PG_*` database environment variables point to the
database snapshot intended for the report before running the command.

```bash
npm run build
npm run transparency:export -- \
  --start=2026-01-01 \
  --end=2026-06-30 \
  --timezone=Asia/Taipei \
  --slug=2026-H1 \
  --out-dir=./tmp/transparency-metrics
```

The command writes both files below.

```text
transparency-metrics-2026-H1.json
transparency-metrics-2026-H1.csv
```

## Optional External Structured Metrics

Government, legal, and privacy request logs may live outside the application
database. Policy, model, and recommendation change logs may also come from
reviewed public documentation instead of database tables. When those sources
have been reviewed and reduced to safe structured fields, pass a local JSON
file with `--external-metrics`.

```bash
npm run build
npm run transparency:export -- \
  --start=2026-01-01 \
  --end=2026-06-30 \
  --timezone=Asia/Taipei \
  --slug=2026-H1 \
  --out-dir=./tmp/transparency-metrics \
  --external-metrics=/path/to/private/aggregate-transparency-metrics.json
```

Request metrics in the external file must contain aggregate counts only.
Change logs may contain public-safe date, category, summary, and public URL
fields. The file must not include case records, requester names, email
addresses, IP addresses, original content, internal notes, reviewer notes,
legal document text, attachments, or private case identifiers.

See `docs/NCCTransparencyExternalMetrics.example.json` for the supported
schema. Unknown fields are rejected so accidental case-level data does not
enter the export.

## Included Metrics

- Moderation case totals and distributions by target type, source, reason,
  status, outcome, automation role, and notice state.
- Appeal counts from moderation events and Community Watch review events.
- Handling-time aggregates for moderation cases with `resolved_at`.
- Community Watch action counts, reason distribution, appeals, restores, and
  staff review counts.
- Explicit `not_recorded` fields for government requests, privacy requests,
  policy changes, model changes, and recommendation changes until their
  structured sources are wired in.
- Optional government request, privacy request, policy change, model change,
  and recommendation change metrics when a reviewed external metrics JSON file
  is provided.

## Privacy Boundary

The export only includes aggregate bucket counts. It must not include user ids,
email addresses, IP addresses, original content, internal notes, reviewer notes,
report ids, legal document content, or case-level records.

The focused test at
`src/connectors/__test__/transparencyService.test.ts` asserts this boundary by
seeding sensitive source fields and checking that the generated JSON omits them.

## Data Status

The first version marks the overall dataset as `partial` because legacy reports
do not yet have complete structured sources. Government request, privacy
request, policy change, model change, and recommendation change metrics are
marked `not_recorded` unless a reviewed external metrics file is passed with
`--external-metrics`.

Do not convert `not_recorded` or `unknown` fields into `0` in the public report.
Zero means a fully recorded source had no matching events in the period.
