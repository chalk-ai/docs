---
title: Vector Databases
description: Configure and use vector databases for efficient nearest neighbor search
published: true
---

---

Vector databases enable efficient storage and retrieval of high-dimensional vectors for nearest neighbor search operations. Chalk integrates with vector databases to provide scalable vector search capabilities for your feature pipelines.

## Configuration

Vector databases can be configured through your Chalk dashboard at **Integrations -> Vector DB**. Once configured, your vector database becomes available for use with [vector search](/docs/vector-search) operations.

## Vector Search

After configuring a vector database integration, you can leverage Chalk's [nearest neighbor search capabilities](/docs/vector-search) to find similar vectors across your feature classes. When you define a `has_many` relationship using the `is_near` method, the query is delegated to the underlying vector store for efficient processing.

```py
from chalk.features import DataFrame, embed, features, has_many, Vector

@features
class SearchQuery:
    query: str
    embedding: Vector = embed(...)
    topic: str
    nearest_documents: DataFrame[FAQDocument] = has_many(
        lambda: SearchQuery.embedding.is_near(
            FAQDocument.question_embedding
        ) & (SearchQuery.topic == FAQDocument.topic) # Additional filters can optionally be added to the join

    )

@features
class FAQDocument:
    question: str
    question_embedding: Vector = embed(...)
    topic: str
    link: str
```

In this example, the `has_many` response from the join will be delegated to the configured vector database which performs the efficient nearest neighbor search. The `FAQDocument.question_embedding` is stored in the vector store: the following section discusses how the embeddings are loaded into the vector store.

## Persisting Vector Features

Vector features—those used in nearest neighbor joins—are automatically persisted to your vector store. This ensures that your vectors are readily available 
for efficient querying. Typically, embeddings are either generated from streams or offline/scheduled runs.

### Using Streams

Vector features can be persisted through chalk streams. This approach allows you to continuously update your vector store as new data arrives:

```py
from chalk.streams import KafkaSource
from chalk.features.resolver import Sink, make_stream_resolver
from chalk.features import _
from chalk import online
from pydantic import BaseModel


class DocumentMessage(BaseModel):
    id: int
    text: str


documents_stream = KafkaSource(
    name="documents_stream",
)

embeddings_stream = KafkaSource(
    name="document_embeddings",
)

make_stream_resolver(
    name="process_documents",
    source=documents_stream,
    message_type=DocumentMessage,
    output_features={
        Document.id: _.id,
        Document.text: _.text,
        Document.embedding
    },
)

@online
def compute_document_embedding(
    text: Document.text,
) -> Document.embedding:
    """Generate document embedding using a pre-trained model."""
    # In a real implementation, this would use a model like sentence-transformers
    return compute_embedding(text)
```

When vector features are computed in streaming resolvers, they are automatically persisted to your configured vector database.

### Using Offline or Scheduled Jobs

Alternatively, you can ingest vector features through offline or scheduled jobs. These jobs compute and load vector features to the vector database in batch:

```py
from chalk import offline
from chalk import ScheduledQuery

@offline
def ingest_embeddings(
    document_text: Document.text
) -> Document.embedding:
    return compute_embedding(document_text)


ScheduledQuery(
    name="generate_document_embeddings",
    schedule="0 0 * * *",
    output=[Document.embedding],
    # store online will cause the vector to be persisted
    store_online=True,
    store_offline=True,
    incremental_resolvers="documents",
)
```

The scheduled query will load newly calculated embeddings into the vector database, making them queryable through nearest neighbor operations.

## Query Flow

When you execute a query that includes a nearest neighbor relationship:

1. Chalk identifies the vector search operation in your query
2. The query is delegated to your configured vector database
3. The vector store performs efficient approximate nearest neighbor search
4. Results are returned as a Chalk DataFrame, ready to use in your resolvers

This delegation ensures that vector search operations leverage the specialized indexing and query capabilities of your vector database, providing optimal performance for high-dimensional similarity search.
