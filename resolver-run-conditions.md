---
title: Run Conditions (Online / Offline)
description: How to specify run conditions for different resolvers
---

Each Chalk resolver you write has run conditions. The most fundamental of 
these, and the main focus of this section, will be the online/offline
condition. However, there are additional ways of optionally specifying 
further conditions on when a resolver runs: these include environment, 
tags, and scheduling.

## Offline vs. Online

Online and offline resolvers have different read/write needs. Your online 
environment stores data that you want to cache
for the period you'd like to cache it.
While this is usually a small amount of data,
you want exceptionally fast reads.
These access patterns fit well
with the performance characteristics of [Redis](https://redis.com) or [BigTable](https://cloud.google.com/bigtable),
where Chalk stores your online data.

The offline environment stores far more data than the online environment.
It keeps a record of [all online runs](#online-to-offline)
and indexes all data brought in from your offline data sources.
This timeseries data is highly compressible,
as many features change less frequently than they are sampled
(for example, users on your platform might very rarely change their names.)
Chalk uses the column store
[Timescale](https://timescale.com) or the data warehouse [BigQuery](https://cloud.google.com/bigquery)for this data.

In addition, offline queries write their output to a [parquet file](https://parquet.apache.org/)
in cloud storage (S3/GCS), whereas online queries write their results to database.

[//]: # "More detail [Chalk architecture](/docs/architecture)"

### Querying

Online queries are used to receive information about a single entity.
For example, you might be looking to compute the features of a
credit model for a single user, or decide what products to suggest
to a customer. Thus, online queries are designed to be as quick as possible -
within milliseconds. You can use our [API client](/docs/query-basics) to pull this information.

Offline queries are used to sample historical data about many entities
at specific points in time for model training or investigation.
When you execute an offline query, Chalk will kick off a job that acquires the requested data for
every primary key/timestamp combination presented. This could take a few seconds!
Since offline queries often lookup data for thousands of
rows, they are not designed to be used to make millisecond-level decisions.
See our guide on [querying training data](/docs/training-client)
for a more in-depth treatment.

|                  | online query                                                                                                                       | offline query                                                                                                                                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| online resolver  | <code className="whitespace-nowrap before:content-none text-pink-400 after:content-none"> @online </code> resolver will run        | <code className="whitespace-nowrap before:content-none text-pink-400 after:content-none"> @online </code> resolver will run if there is no <code className="whitespace-nowrap before:content-none text-pink-400 after:content-none"> @offline </code> resolver with the same definition |
| offline resolver | <code className="whitespace-nowrap before:content-none text-pink-400 after:content-none"> @offline </code> resolver will never run | <code className="whitespace-nowrap before:content-none text-pink-400 after:content-none"> @offline </code> resolver will run                                                                                                                                                            |

## Restricting Resolver Execution By Environment

Environments are used to trigger behavior in different deployments
such as staging, production, and local development.
For example, you may wish to interact with a vendor via an API call
in the `production` environment, and opt to return a constant value
in a `staging` environment.

### Specifying environments

You can choose to scope resolvers to a restricted set of environments.
Resolvers optionally take a keyword argument named `environment`
that can take one of three types:

- **Unassigned (default)** - The resolver will be a candidate to run in _every_ environment.
- **String value** - The resolver will run _only_ in this environment.
- **List of strings** - The resolver will run in _any_ of the specified environments and no other environments.

### Example

Say your fraud models needed to interact with a fraud vendor that you wanted
to mock out in staging. We can scope the environments as follows:

```python
@online(environment="**production**")
def fraud_score_prod(email: User.email, phone: User.phone) -> User.fraud_score:
    return api_vendor.fraud_score(email)

@online(environment=["**staging**", "**dev**"])
def fraud_score_staging(email: User.email) -> User.fraud_score:
    if email == "fraud_user@chalk.ai":
        return 10
    return 90
```

Resolvers in different environments don't need to take the same arguments.
In the above example, the production version of the resolver takes a phone
number and an email, while the staging version of the resolver takes only
the email.

## Restricting Resolver Execution Conditions With Tags

Tags can be either a string value, or a key-value pair.
As a best practice
(and fitting with recommendations from other services like
[Datadog](https://docs.datadoghq.com/getting_started/tagging/#unified-service-tagging)),
we recommend using key-value pairs, but the choice is yours.

There are two ways to specify tags on resolvers:

- **<code className="before:content-none after:content-none">"key"</code>** -
  As a single scalar string.
- **<code className="before:content-none after:content-none">"key:value"</code>** -
  As a string value representing a key-value pair.

Resolvers take one or many tags, all of which need to match for the
resolver to run. For example, you may want to test with
a sandboxed vendor, and also be able to set a constant value
for a particular feature.

```py
@online(tags=["**api:mock**", "**fraud**"])
def simulate_fraud(id: User.id) -> User.fraud_score:
    return 100

@online(tags="**api:mock**")
def simulate_no_fraud(id: User.id) -> User.fraud_score:
    return 10

@online(tags="**api:sandbox**")
def sandbox_score(
    name: User.name,
    email: User.email,
) -> User.fraud_score:
    return sandbox.fraud_score(name, email).score

@online
def real_score(
    name: User.name,
    email: User.email,
) -> Features[User.fraud_score, User.fraud_tags]:
    r = prod.fraud_score(name, email).score
    return User(fraud_score=r.score, fraud_tags=r.tags)
```

In the above example, the resolver that is chosen to compute
the `User.fraud_score` feature will depend on the tags provided
at query time. The table below shows which resolver will be
chosen for a given set of tags.

| Query tags                                                              | Resolver                                                             |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| <span className="font-mono text-accent-teal"> [api:mock, fraud] </span> | <span className="font-mono text-pink-500"> simulate_fraud </span>    |
| <span className="font-mono text-accent-teal"> api:mock </span>          | <span className="font-mono text-pink-500"> simulate_no_fraud </span> |
| <span className="font-mono text-accent-teal"> api:sandbox </span>       | <span className="font-mono text-pink-500"> sandbox_score </span>     |
| <span className="font-mono text-accent-teal"> &lt;otherwise&gt; </span> | <span className="font-mono text-pink-500"> real_score </span>        |

Note that these resolvers don't need to take the same set of inputs,
and don't need to return the same types.

### When tagged resolvers run

Like [Environments](/docs/resolver-environments), tags control when resolvers run
based on the
[Online Context](/docs/query-basics) or [Training Context](/docs/training-client)
matching the tags provided to the resolver decorator.
Resolvers optionally take a keyword argument named `tags`
that can take one of three types:

- **Unassigned (default)** - The resolver will be a candidate to run for _every_ set of tags.
- **String value** - The resolver will run _only_ if this tag is provided.
- **List of strings** - The resolver will run _only_ if _all_ of the specified tags match.

If your resolver is tagged only by a key (not a key-value pair),
and the request context contains a key-value pair such that the resolver's
tag (a key only) matches they key of a key-value pair in the context,
the resolver will be eligible to run. For example:

| Resolver Tag                                                                 | Request Context                                                           | Matches? |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------- |
| <span className="font-mono text-accent-teal"> api </span>                    | <span className="font-mono text-pink-500"> api </span>                    | Yes      |
| <span className="font-mono text-accent-teal"> api </span>                    | <span className="font-mono text-pink-500"> api:live </span>               | Yes      |
| <span className="font-mono text-accent-teal"> [api:live, mock-phone] </span> | <span className="font-mono text-pink-500"> [api:live, mock-phone] </span> | Yes      |
| <span className="font-mono text-accent-teal"> [api:live, mock-phone] </span> | <span className="font-mono text-pink-500"> api:live </span>               | No       |
| <span className="font-mono text-accent-teal"> api:live </span>               | <span className="font-mono text-pink-500"> api </span>                    | No       |
| <span className="font-mono text-accent-teal"> api:fixture </span>            | <span className="font-mono text-pink-500"> api:live </span>               | No       |

### Example

Frequently, you'll want to combine tags and [Environments](/docs/resolver-environments),
as below.
This span uses a constant value in staging when the tag `api` takes the value `fixture`,
uses the sandboxed fraud vendor in staging when the tag `api` takes the value `live`,
and uses the production fraud vendor in production.

```python
@online(environment="staging", tags="**api:fixture**")
def fraud_score_fixture(email: UserFeatures.email) -> UserFeatures.fraud_score:
    if email == "elliot@chalk.ai":
        return 100
    return 50

@online(environment="staging", tags="**api:live**")
def fraud_score_sandbox(email: UserFeatures.email) -> UserFeatures.fraud_score:
    return api_vendor_sandbox.fraud_score(email, profile="dev")

@online(environment="production")
def fraud_score_prod(email: UserFeatures.email) -> UserFeatures.fraud_score:
    return api_vendor_live.fraud_score(email)
```
