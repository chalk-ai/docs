---
title: Overview
description: Fetch feature values via queries.
---

---

To request or compute data with Chalk, you'll use **queries**. In general,
when you run a Chalk query, you are either: requesting the most up-to-date
values for your feature sets, requesting a set of historical data
for your feature sets, or running a backfill or batch job.

The first use case is accomplished through **online queries**, which try to
return values for a single feature set as quickly as possible: taking
advantage of caching and distributed execution.

The latter use cases are accomplished through offline queries which execute
over the offline store and can return multiple instances of a feature set.

## What are Queries

At a high level, a query specifies input features and output features.
Inputs differ slightly for online queries and offline queries, but in both
cases the input must contain the primary key of your requested feature set.

For example, for an online query, the input could be the id of a user for
which you want to compute output features. You can also specify additional
features that "overwrite" the features your resolver would otherwise compute.
For instance, you could run an online query passing one of your user's ids but also
a hard coded name. Using Chalk's CLI, this would look like the following:

```sh
chalk query --in user.id=1 --in user.name=mary --out user
```

For offline queries, the input is a list of ids for one of your feature
sets and, optionally, any number of lists containing values for any other
feature from the same namespace.

Online and offline queries differ most in their output. An online
query only ever returns one value for each requested output feature, which
it retrieves either from the cache or by executing resolvers.

An offline query returns all requested computed features for all requested ids.
For instance, say you've computed the number of transactions (`num_transactions`)
for a User with id 1 every day over the past week. Making an offline query
with `user.id=1` as an input and `user.num_transactions` as an output would
return all seven of the previously computed feature `num_transaction` feature
values.

Offline queries are often restricted by lower and upper bound timestamps
which constrain the outputs to a specific temporal range.

## Query Side Effects

Chalk queries return and write data. This is an essential part of
Chalk: every time you compute a feature, either through an online or offline
query, the output is written down in the offline store. This makes it easy to:

- create datasets from your previously computed features,
- monitor and track your computed features over time.

| Online query                                                                               | Offline query                                                                                                                             |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Returns one row of data about one entity                                                   | Returns a dataframe of many rows of historical data corresponding to multiple entities point-in-time                                      |
| Designed to return data immediately in milliseconds                                        | Blocks until computation is complete, not designed for millisecond-level computation                                                      |
| Queries the online store, which caches recent data from online queries for quick retrieval | Queries the offline store (Timescale), which stores all data from both online and offline queries                                         |
| Writes output data to online store database and offline store database                     | Writes output to offline store database and a parquet file containing results to cloud storage. Only writes to online store if specified. |

---

## Running Queries

Queries are executed against deployments or branches. The easiest way to execute
a query is either: 1). with the Chalk CLI, or 2). with one of Chalk's API
clients.

### Running Online Queries

Online Queries can be run using the chalk CLI:

```bash
chalk query --in user.id=1 --in user.name=mary --out user
```

or one of our API Clients:

```python
from chalk.client import ChalkClient

client = ChalkClient()
client.query(
  inputy={'user.id': 1},
  output=['user.name'],
  # branch='test', # run against a branch
)
```

### Running Offline Queries

Offline Queries can be run with one of our API Clients.

```python
from chalk.client import ChalkClient
from datetime import datetime

client = ChalkClient()
client.offline_query(
  input={'user.id': [1,2,3,4]},
  output=['user.name']
  # branch='test',                      # run against a branch
  # recompute_features=True,            # recompute features
  # run_async=True,                     # run in separate pod from active deployment
  # max_samples = 10,                   # max of 10 samples
  # lower_bound=datetime(2024, 10, 12), # sample computed after 10.12.2024
  # upper_bound=datetime(2024, 10, 20), # sample computed before 10.20.2024
)
```

### Scheduled and Triggered Resolver Run

Specific resolvers can also be [scheduled](/docs/resolver-cron) or [triggered](/docs/runs) (for instance as part of engineering pipelines like airflow). Functionally, triggers and schedules can be thought of as queries, which execute on large portions of your data.
