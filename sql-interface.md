# Overview

## What is ChalkSQL?

Isn't Chalk a feature store??? What does SQL have to do with feature stores?

While you could certainly use Chalk as a traditional feature store--we by all means cover the core use case of low-latency retrieval through a centralized feature registry (based on your semantic models)--Chalk goes far beyond the typical boundaries of what feature stores were designed to do!

Unlike conventional approaches that just cache static features, Chalk dynamically fetches and computes features with sub-second latency across heterogeneous data sources (databases, streams, S3, microservices, 3rd-party API clients).

Our SQL interface allows you to treat your features as a queryable dataset, giving you both the operational benefits of a feature store and the analytical flexibility of an (Iceberg native) enterprise data warehouse, all in one platform.

In addition to familiar SQL syntax, data teams gain access to entirely new usage patterns and workflows around data quality, model performance, and real-time system operations.

Surfacing a SQL interface effectively:
- extends Chalk's real-time execution engine into any environment where teams already work with SQL e.g. BI
- gives machine learning engineers the ability to introspect their inference, AI, and machine learning pipelines enabling rapid debugging of model predictions, data lineage, and feature drift
- democratizes access to high quality data (via a unified semantic layer) throughout the organization

Easily compute expressions with inputs from a multitude of data sources e.g. the name match score for a user:

```sql
SELECT
    jaccard_similarity(lower(f.profile_name), lower(m.username)) AS similarity,
    f.user_id,
    f.profile_name,
    m.username
FROM support_forum_users f
JOIN marketplace_users m ON f.user_id = m.user_id
```

In our username similarity example, Chalk acts as a centralized gateway to your data ecosystem, enabling you to compute new features on the fly--across disparate sources--leveraging our extensive function library.

We can extend this even further by interfacing with the semantic model you've defined within Chalk.

For instance, we can compute an affordability score for items based on a user's average spend:

```sql
SELECT
    i.item_id,
    i.most_recent_price,
    u.average_spend,
    SIGMOID(ABS(i.most_recent_price - u.average_spend) / u.average_spend) AS affordability_cap
    -- most_recent_price and average_spend are both computed on the fly as expressed by your semantic model
FROM "postgres.public.items" i
CROSS JOIN "postgres.public.users" u
WHERE u.user_id = 47
ORDER BY affordability_cap
```

Both, `average_spend` and `most_recent_price` are features defined within Chalk's semantic model, if your machine learning teams modify the underlying logic for these features, the results of your SQL queries will automatically reflect those changes without any additional work on your part.

### Common use cases for ChalkSQL

ChalkSQL unlocks a wide range of data and ML workflows, we walk through some of the most common ones:
- Generative AI and ML
    - Real-time feature retrieval (online store)
    - Real-time expression evaluation with Chalk's extensive function library (exposed as native SQL functions)
- Observability
    - Data lineage and feature monitoring
- Data integration and ELT
    - Reverse-ETL from your data warehouse into Chalk for feature serving
- Data science
    - Dataset preparation with offline queries for model training

Let's dive into each of these in more detail, with some example queries.

### Generative AI and ML

We've already seen an example of both real-time feature retrieval and dynamic expression evaluation with ChalkSQL.

Any operator that's available in Chalk's function registry can be used in a SQL query, we can even make HTTP requests:

```sql
select http_get(internal_profile_url) from postgres.public.users
```

Features that are typically resolved through the online store and used in inference can also be fetched directly.
A `User` may have a feature like `name_match_score` in its namespace that's computed on the fly and depends on the computation of other features:

```py
@features
class User:
    id: int
    first_name: str
    last_name: str
    user_name: str
    name_match_score: float = F.jaccard_similarity(
        F.lower(_.first_name) + " " + F.lower(_.last_name),
        F.lower(_.username),
    )

    last_purchase_date: datetime
```

We can query a subset of the `User` feature class:

```sql
select user_name, name_match_score from <TODO> where 'user.id' = 47
```

ChalkSQL's support for querying across multiple data catalogs (online store, underlying raw data sources, etc.) dramatically broadens the scope of analysis accessible to data teams.

Dynamic expression evaluation with Chalk's extensive function library (exposed natively in SQL) streamlines feature experimentation.
Easily iterate on new features with SQL before deciding to promote them to your production deployment; prototype directly in SQL before committing to code changes.:

```sql
select JACCARD_SIMILARITY(CONCAT(LOWER(first_name),' ',LOWER(last_name)), username) from users
```

Typically, testing a new feature like `name_match_score` would require deploying to a feature branch (< 10s) and then running a chalk query from the CLI or by using dynamic expressions from within a Jupyter notebook.

```py
# chalk for data scientists
from chalk.features import _

# can load features from prod into notebook directly
client.load_features()
User.new_on_demand_feature = _.total_product_inquiry_count / _.total_orders_placed
```

The Chalk expression for computing the `name_match_score` can be easily expressed through SQL without needing to deploy to a feature branch: `chalk apply --branch=name_match_score`.


By referencing the resolver catalog `chalk.resolvers`, we can query a resolver defined within your Chalk deployment.

```sql
SELECT "top_recurring_purchases.title"
FROM "chalk.resolvers"
WHERE "user.id" = 47
```

Querying the `top_recurring_purchases.title` [(DataFrame)](https://docs.chalk.ai/docs/python-resolvers#data-frame-output) resolver returns the top recurring purchases for `User.id = 47`.

### Model training and Feature monitoring and observability

We can query for historical features and construct datasets for model training.
In this example, we'll pull all the average ratings for 100 marketplace items:

```sql
SELECT * FROM 'chalk.historical_values.item.average_rating' WHERE pkey < 100
```

We'll get back every computation of average rating for items 1 through 100, which we can pivot and chart to see how the feature has changed over time or use in combination with other features for model training.
Chalk keeps track of both when the feature was fetched as well as when the feature was observed (`observed_at`) e.g. we might request the average rating for an item in December, while the last review was left in September.
We can leverage`observed_at` to gain a more accurate picture of how features have evolved.

Queries like this can be easily run on a schedule and used to populate dashboards for feature monitoring (skew, drift, distributions, etc.).
Enabling teams to build charts inside their BI tools in addition to the [chart building capabilities available natively from within the Chalk dashboard.](https://docs.chalk.ai/docs/metricmonitor#customize-your-metrics-dashboard)

### Platform observability and system diagnostics

Caching features up to a certain `max_staleness` is a common (and powerful) design pattern for guaranteeing low-latency retrieval especially when referencing expensive microservices and APIs.
The contents of your online store (cache) can be accessed directly with SQL and aggregated to provide visibility into the memory consumption of various components:

```sql
SELECT key_type, fqn, SUM(memory_usage), COUNT(*) from chalk.online_store.keys GROUP BY key_type, fqn limit 10;
```

In addition to inspecting our online store, we can also extract query log data for insights around query execution times, deployment status, and trace information which can be leveraged for system debugging and introspection.

```sql
SELECT * FROM chalk.query_log.data
```

The metadata surfaced includes fields such as `execution_started_at`, `query_status`, `agent_id`, and `deployment_id`.

This unlocks a variety of operational analysis:
- Identify slow-running queries by analyzing `execution_started_at` to `execution_finished_at` durations
- Filter for queries that have failed
- Compare query performance between deployment versions
- Correlate issues across services by linking `agent_id` and `deployment_id`

See the SQL reference page for a full list of the available fields in the `chalk.query_log.data` table.

### Cross-catalog query planning

Chalk's query planner still generates optimized plans despite queries being cross-catalog.
This eliminates the typical technical barriers that traditionally foster data silos and the need for intricate custom data pipelines just for the sake of basic observability.

ChalkSQL enables you to query across all these data sources seamlessly:
- Raw data sources (`postgres.public`)
- Real-time feature computations (`chalk.<TODO>`)
- Resolver outputs (`chalk.resolvers`)
- Historical feature values (`chalk.historical_values`)
- System metadata and logs (`chalk.query_log.data`)

With all your data sources unified under one interface, data teams can easily:

- Debug system performance and monitor features in real-time
- Move from raw data exploration to production feature analysis without spinning up new pipelines
- Democratize access to high quality data (already vetted features) via a familiar SQL interface

### Live Demo

<TODO> Embed video demo of ChalkSQL

# Installation and getting started

## How does ChalkSQL work?

<TODO> I'd write this based off of Bill's technical blog post; currently don't have the context to write this

- VPC
- Data import and export
    - Data loading
    - Data unloading
- Working with data lakes
    - Lakehouse formats
    - Parquet + Iceberg
    - Effectively sets up Chalk as a database because we also are a data store now
- Query acceleration??
- Performance and quality

## How do I configure ChalkSQL?

ChalkSQL requires no additional configuration beyond your existing Chalk deployment.
Under the hood, ChalkSQL leverages the same infrastructure, data sources, and feature definitions you've already configured in Chalk.
All your connected databases, APIs, and semantic models are automatically accessible through the SQL interface.
Access control, authentication, and security policies are inherited from your Chalk environment, so there's no need to set up separate permissions or credentials.
Simply connect to ChalkSQL through any of the supported methods (Dashboard, CLI, or client APIs) and start querying—your entire Chalk ecosystem is immediately available.

## How do I connect to ChalkSQL?

### Chalk Dashboard

SQL queries can be run directly from the Chalk dashboard.
Navigate to our Data Explorer from the navigation side bar.
After selecting ChalkSQL, a view will open with a SQL query editor.

The dashboard also lists the catalogs accessible and supports copying the qualified name of the catalogs and underlying tables.

TODO <embed picture of chalk dashboard>

### Client APIs

ChalkSQL queries can be run directly from a Jupyter Notebook or in a Python script with a `run_sql` function call through the gRPC client.

Import the gRPC client like so:

```py
from chalk.client.client_grpc import ChalkGRPCClient

grpc_client: ChalkGRPCClient = ChalkGRPCClient()
grpc_client.run_sql(sql="select * from )
```

### With the Chalk CLI

SQL queries can be executed directly from the command line using the Chalk CLI.

Run queries using the `chalk sql` command:

```bash
chalk sql "SELECT * FROM postgres.public.users WHERE user_id = 47"
```

### From your own BI tools via JDBC/ODBC/ADBC

We're actively developing driver support to enable these use cases.
This will allow you to connect to Chalk as you would any other data warehouse or database system.

In the meantime, you can:
- Use a Chalk SDK and client to query features programmatically
- Use the Chalk REST API for integration with external systems
- Export feature data to a data warehouse for SQL-based analysis

# ChalkSQL Reference

## Schema Definition

Use the `SHOW SCHEMAS` command to view the catalogs available through ChalkSQL.

```
shape: (7, 3)
┌──────────────┬────────────────────┬─────────────────────────────────────────────────────┐
│ catalog_name ┆ schema_name        ┆ description                                         │
│ ---          ┆ ---                ┆ ---                                                 │
│ str          ┆ str                ┆ str                                                 │
╞══════════════╪════════════════════╪═════════════════════════════════════════════════════╡
│ chalk        ┆ historical_values  ┆ Provides views into offline store observation tabl… │
│ chalk        ┆ information_schema ┆ Provides views into information about the ChalkSQL… │
│ chalk        ┆ query_log          ┆ Provides a view into the query log table, a means … │
│ chalk        ┆ resolvers          ┆ Provides views to run root resolvers and query aga… │
│ clickhouse   ┆ default            ┆ null                                                │
│ postgres     ┆ public             ┆ null                                                │
│ postgres     ┆ github_repo        ┆ null                                                │
└──────────────┴────────────────────┴─────────────────────────────────────────────────────┘
```

Alternatively, we can query and filter the catalog schema like so:

```sql
SELECT * FROM chalk.information_schema.schemata WHERE catalog_name = 'chalk';
```

### Output (Shape: (4, 3))

```
shape: (4, 3)
┌──────────────┬────────────────────┬─────────────────────────────────────────────────────┐
│ catalog_name ┆ schema_name        ┆ description                                         │
│ ---          ┆ ---                ┆ ---                                                 │
│ str          ┆ str                ┆ str                                                 │
╞══════════════╪════════════════════╪═════════════════════════════════════════════════════╡
│ chalk        ┆ historical_values  ┆ Provides views into offline store observation tabl… │
│ chalk        ┆ information_schema ┆ Provides views into information about the ChalkSQL… │
│ chalk        ┆ query_log          ┆ Provides a view into the query log table, a means … │
│ chalk        ┆ resolvers          ┆ Provides views to run root resolvers and query aga… │
└──────────────┴────────────────────┴─────────────────────────────────────────────────────┘

### Tables

We can also list all of the tables that Chalk has access to:

```sql
SHOW TABLES
```

```sql
SELECT * FROM chalk.information_schema.tables
```

Introducing a where clause lets us filter the tables (when we use information schema).
The historical values catalog keeps the computed feature values from Chalk queries.
We have a table for every feature value.


```
shape: (490, 4)
┌──────────────┬───────────────────┬─────────────────────────────────────────────┬─────────────┐
│ catalog_name ┆ schema_name       ┆ table_name                                  ┆ description │
│ ---          ┆ ---               ┆ ---                                         ┆ ---         │
│ str          ┆ str               ┆ str                                         ┆ str         │
╞══════════════╪═══════════════════╪═════════════════════════════════════════════╪═════════════╡
│ chalk        ┆ historical_values ┆ fathom_call_data.id                         ┆ null        │
│ chalk        ┆ historical_values ┆ fathom_call_data.call_id                    ┆ null        │
│ chalk        ┆ historical_values ┆ fathom_call_data.meeting_scheduled_end_time ┆ null        │
│ chalk        ┆ historical_values ┆ fathom_call_data.company_domain             ┆ null        │
│ chalk        ┆ historical_values ┆ fathom_call_data.has_external_attandees     ┆ null        │
│ …            ┆ …                 ┆ …                                           ┆ …           │
│ postgres     ┆ public            ┆ github_users_fake                           ┆ null        │
│ postgres     ┆ public            ┆ github_users_fake_dagster                   ┆ null        │
│ postgres     ┆ public            ┆ github_users_fake_events                    ┆ null        │
│ postgres     ┆ public            ┆ github_events                               ┆ null        │
│ postgres     ┆ public            ┆ marketplace_items                           ┆ null        │
└──────────────┴───────────────────┴─────────────────────────────────────────────┴─────────────┘
```

, in the case of historical values, we have a table that maps to each feature and feature class.

In the context of historical v

### Functions

```sql
SHOW FUNCTIONS
```

```sql
SELECT * FROM chalk.information_schema.functions
```

The function tables will, lists all of the Chalk expresssions that are exposed the SQL interface.
We'll also expose metadata about each function, most notably:
- signature e.g.  `<DOUBLE, DOUBLE>`
- return type
- is_aggregate - whether this is an aggregation function
- description - a description of what the function does

```
shape: (566, 7)
┌──────────────────┬───────────────┬───────────────────────────────────────────┬───────────────────────────────────────────┬──────────────┬─────────────────┬──────────────────────────────────────────┐
│ function_catalog ┆ function_name ┆ function_signature                        ┆ return_type                               ┆ is_aggregate ┆ is_table_valued ┆ description                              │
│ ---              ┆ ---           ┆ ---                                       ┆ ---                                       ┆ ---          ┆ ---             ┆ ---                                      │
│ str              ┆ str           ┆ str                                       ┆ str                                       ┆ bool         ┆ bool            ┆ str                                      │
╞══════════════════╪═══════════════╪═══════════════════════════════════════════╪═══════════════════════════════════════════╪══════════════╪═════════════════╪══════════════════════════════════════════╡
│ chalk            ┆ %             ┆ <BIGINT, BIGINT>                          ┆ BIGINT                                    ┆ false        ┆ false           ┆ Calculates the modulo (remainder) of two │
│                  ┆               ┆                                           ┆                                           ┆              ┆                 ┆ integers.                                │
│ chalk            ┆ %             ┆ <DOUBLE, DOUBLE>                          ┆ DOUBLE                                    ┆ false        ┆ false           ┆ Calculates the modulo (remainder) of two │
│                  ┆               ┆                                           ┆                                           ┆              ┆                 ┆ floating-…                               │
│ chalk            ┆ &             ┆ <BOOLEAN, BOOLEAN>                        ┆ BOOLEAN                                   ┆ false        ┆ false           ┆ boolean & operation                      │
│ chalk            ┆ *             ┆ <TINYINT, TINYINT>                        ┆ TINYINT                                   ┆ false        ┆ false           ┆ Multiplies two numbers together.         │
│ chalk            ┆ *             ┆ <SMALLINT, SMALLINT>                      ┆ SMALLINT                                  ┆ false        ┆ false           ┆ Multiplies two numbers together.         │
│ …                ┆ …             ┆ …                                         ┆ …                                         ┆ …            ┆ …               ┆ …                                        │
│ chalk            ┆ yow           ┆ <TIMESTAMP WITH TIME ZONE>                ┆ BIGINT                                    ┆ false        ┆ false           ┆ Extracts the year of the ISO week from a │
│                  ┆               ┆                                           ┆                                           ┆              ┆                 ┆ date.                                    │
│ chalk            ┆ zi_split_part ┆ <VARCHAR(2^64), VARCHAR(2^64), BIGINT>    ┆ VARCHAR(2^64)                             ┆ false        ┆ false           ┆ Splits a string by delimiter and returns │
│                  ┆               ┆                                           ┆                                           ┆              ┆                 ┆ the part …                               │
│ chalk            ┆ zip           ┆ <STRUCT(chalk.generic:TINYINT) ARRAY,     ┆ STRUCT(f1:STRUCT(chalk.generic:TINYINT),f ┆ false        ┆ false           ┆ Combines two lists element-wise into a   │
│                  ┆               ┆ STRUCT(chalk…                             ┆ 2:STRUCT(…                                ┆              ┆                 ┆ list of pai…                             │
│ chalk            ┆ |             ┆ <BOOLEAN, BOOLEAN>                        ┆ BOOLEAN                                   ┆ false        ┆ false           ┆ boolean | operation                      │
│ chalk            ┆ ~             ┆ <BOOLEAN>                                 ┆ BOOLEAN                                   ┆ false        ┆ false           ┆ boolean ~ operation                      │
└──────────────────┴───────────────┴───────────────────────────────────────────┴───────────────────────────────────────────┴──────────────┴─────────────────┴──────────────────────────────────────────┘
```

```sql
SELECT * FROM chalk.information_schema.functions WHERE function_name = 'http_request'
```

```
shape: (2, 7)
┌──────────────────┬───────────────┬────────────────────────────────┬────────────────────────────────────────────────────┬──────────────┬─────────────────┬────────────────────────────────────────────┐
│ function_catalog ┆ function_name ┆ function_signature             ┆ return_type                                        ┆ is_aggregate ┆ is_table_valued ┆ description                                │
│ ---              ┆ ---           ┆ ---                            ┆ ---                                                ┆ ---          ┆ ---             ┆ ---                                        │
│ str              ┆ str           ┆ str                            ┆ str                                                ┆ bool         ┆ bool            ┆ str                                        │
╞══════════════════╪═══════════════╪════════════════════════════════╪════════════════════════════════════════════════════╪══════════════╪═════════════════╪════════════════════════════════════════════╡
│ chalk            ┆ http_request  ┆ <VARCHAR(2^64), VARCHAR(2^64), ┆ STRUCT(status_code:BIGINT,headers:MAP(VARCHAR(2^64 ┆ false        ┆ false           ┆ Makes an HTTP request with string body and │
│                  ┆               ┆ MAP(VARCHAR(2^64),V…           ┆ …                                                  ┆              ┆                 ┆ returns…                                   │
│ chalk            ┆ http_request  ┆ <VARCHAR(2^64), VARCHAR(2^64), ┆ STRUCT(status_code:BIGINT,headers:MAP(VARCHAR(2^64 ┆ false        ┆ false           ┆ Makes an HTTP request with binary body and │
│                  ┆               ┆ MAP(VARCHAR(2^64),V…           ┆ …                                                  ┆              ┆                 ┆ returns…                                   │
└──────────────────┴───────────────┴────────────────────────────────┴────────────────────────────────────────────────────┴──────────────┴─────────────────┴────────────────────────────────────────────┘
```


## ChalkSQL Statements
## ChalkSQL Mutations
## ChalkSQL Clauses
## ChalkSQL Data Types
## ChalkSQL Functions

Functions can be listed with `select * from information_schema.functions` or with the `SHOW FUNCTIONS` command.

```sql
SHOW FUNCTIONS
```

<TODO>

function_catalog,function_name,function_signature,return_type,is_aggregate,is_table_valued,description

```sql
SELECT function_name, MIN(description) AS description
FROM chalk.information_schema.functions
GROUP BY function_name;
```

```
shape: (566, 7)
┌──────────────────┬───────────────┬───────────────────────────────────────────┬───────────────────────────────────────────┬──────────────┬─────────────────┬──────────────────────────────────────────┐
│ function_catalog ┆ function_name ┆ function_signature                        ┆ return_type                               ┆ is_aggregate ┆ is_table_valued ┆ description                              │
│ ---              ┆ ---           ┆ ---                                       ┆ ---                                       ┆ ---          ┆ ---             ┆ ---                                      │
│ str              ┆ str           ┆ str                                       ┆ str                                       ┆ bool         ┆ bool            ┆ str                                      │
╞══════════════════╪═══════════════╪═══════════════════════════════════════════╪═══════════════════════════════════════════╪══════════════╪═════════════════╪══════════════════════════════════════════╡
│ chalk            ┆ %             ┆ <BIGINT, BIGINT>                          ┆ BIGINT                                    ┆ false        ┆ false           ┆ Calculates the modulo (remainder) of two │
│                  ┆               ┆                                           ┆                                           ┆              ┆                 ┆ integers.                                │
│ chalk            ┆ %             ┆ <DOUBLE, DOUBLE>                          ┆ DOUBLE                                    ┆ false        ┆ false           ┆ Calculates the modulo (remainder) of two │
│                  ┆               ┆                                           ┆                                           ┆              ┆                 ┆ floating-…                               │
│ chalk            ┆ &             ┆ <BOOLEAN, BOOLEAN>                        ┆ BOOLEAN                                   ┆ false        ┆ false           ┆ boolean & operation                      │
│ chalk            ┆ *             ┆ <TINYINT, TINYINT>                        ┆ TINYINT                                   ┆ false        ┆ false           ┆ Multiplies two numbers together.         │
│ chalk            ┆ *             ┆ <SMALLINT, SMALLINT>                      ┆ SMALLINT                                  ┆ false        ┆ false           ┆ Multiplies two numbers together.         │
│ …                ┆ …             ┆ …                                         ┆ …                                         ┆ …            ┆ …               ┆ …                                        │
│ chalk            ┆ yow           ┆ <TIMESTAMP WITH TIME ZONE>                ┆ BIGINT                                    ┆ false        ┆ false           ┆ Extracts the year of the ISO week from a │
│                  ┆               ┆                                           ┆                                           ┆              ┆                 ┆ date.                                    │
│ chalk            ┆ zi_split_part ┆ <VARCHAR(2^64), VARCHAR(2^64), BIGINT>    ┆ VARCHAR(2^64)                             ┆ false        ┆ false           ┆ Splits a string by delimiter and returns │
│                  ┆               ┆                                           ┆                                           ┆              ┆                 ┆ the part …                               │
│ chalk            ┆ zip           ┆ <STRUCT(chalk.generic:TINYINT) ARRAY,     ┆ STRUCT(f1:STRUCT(chalk.generic:TINYINT),f ┆ false        ┆ false           ┆ Combines two lists element-wise into a   │
│                  ┆               ┆ STRUCT(chalk…                             ┆ 2:STRUCT(…                                ┆              ┆                 ┆ list of pai…                             │
│ chalk            ┆ |             ┆ <BOOLEAN, BOOLEAN>                        ┆ BOOLEAN                                   ┆ false        ┆ false           ┆ boolean | operation                      │
│ chalk            ┆ ~             ┆ <BOOLEAN>                                 ┆ BOOLEAN                                   ┆ false        ┆ false           ┆ boolean ~ operation                      │
└──────────────────┴───────────────┴───────────────────────────────────────────┴───────────────────────────────────────────┴──────────────┴─────────────────┴──────────────────────────────────────────┘
```

---

Filter the results of `show functions` to see signatures and return types, also easily scope it down to see all of the aggregators available

```sql
SELECT * FROM chalk.information_schema.functions WHERE function_name = 'http_request'
```

### Output (Shape: (2, 7))

```
shape: (2, 7)
┌──────────────────┬───────────────┬────────────────────────────────┬────────────────────────────────────────────────────┬──────────────┬─────────────────┬────────────────────────────────────────────┐
│ function_catalog ┆ function_name ┆ function_signature             ┆ return_type                                        ┆ is_aggregate ┆ is_table_valued ┆ description                                │
│ ---              ┆ ---           ┆ ---                            ┆ ---                                                ┆ ---          ┆ ---             ┆ ---                                        │
│ str              ┆ str           ┆ str                            ┆ str                                                ┆ bool         ┆ bool            ┆ str                                        │
╞══════════════════╪═══════════════╪════════════════════════════════╪════════════════════════════════════════════════════╪══════════════╪═════════════════╪════════════════════════════════════════════╡
│ chalk            ┆ http_request  ┆ <VARCHAR(2^64), VARCHAR(2^64), ┆ STRUCT(status_code:BIGINT,headers:MAP(VARCHAR(2^64 ┆ false        ┆ false           ┆ Makes an HTTP request with string body and │
│                  ┆               ┆ MAP(VARCHAR(2^64),V…           ┆ …                                                  ┆              ┆                 ┆ returns…                                   │
│ chalk            ┆ http_request  ┆ <VARCHAR(2^64), VARCHAR(2^64), ┆ STRUCT(status_code:BIGINT,headers:MAP(VARCHAR(2^64 ┆ false        ┆ false           ┆ Makes an HTTP request with binary body and │
│                  ┆               ┆ MAP(VARCHAR(2^64),V…           ┆ …                                                  ┆              ┆                 ┆ returns…                                   │
└──────────────────┴───────────────┴────────────────────────────────┴────────────────────────────────────────────────────┴──────────────┴─────────────────┴────────────────────────────────────────────┘
```

---

# FAQ

- Common error messages
- Troubleshooting
