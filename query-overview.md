---
title: Overview
description: Fetch feature values via online query.
---

---

To request or compute data with Chalk, you'll use **queries**. In general,
when you run a Chalk query, you are either requesting the most up-to-date
values for your feature sets or requesting a set of historical data
for your users, or running an expensive backfill or batch job.

In the first case, you will be **running online** queries, which try to
return values for a single feature set as quickly as possible: taking
advantage of caching and distributed execution.

In the later cases, you will be running offline queries which execute
over the offline store (which contains all features that Chalk has
computed) and can return multiple feature sets.

## What are Queries

At a high level, a query specifies input features and output features.
Inputs differ for online queries and offline queries, but in both
cases the input must contain the primary key of your requested feature set.

For an online query, the input might be the id of a user for which you want to
compute output features. You can also specify additionally features
that "overwrite" the features your resolver might otherwise compute. For instance,
you could run an online query passing one of your user's ids, but also
a hard coded name. Using Chalk's cli, this would look like the following:

```sh
chalk query --in user.id=1 --in user.name=mary --out user
```

For offline queries, the input is a list of ids for one of your feature
sets and, like online queries, equally long lists containing values
for any other feature from the same namespace.

Where online and offline queries most differ is in their output. An online
query only ever returns one value for each requested output feature, which
it retrieves either from the cache or by executing the necessary resolvers.
An offline query returns all computed features for all requested ids. For instance,
if you've computed the number of transactions for a User with id 1 every day
over the past week, including `user.id=1` as an input to your offline query
would return all seven of those feature values.

Offline queries are typically bounded by lower bound and upper bound timestamps
which constrain the outputs to a specific temporal range.

---

## Running Queries

Queries are executed against deployments or branches.

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

### Scheduled and Triggered Resolver Runs

Specific resolvers can also be scheduled or triggered as part of engineering
pipelines like airflow. Behind the scenes, Chalk treats both of these as queries.
