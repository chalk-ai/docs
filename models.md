---
title: "Chalk Models"
metaDescription: Learn how to run, train, and track ML models in Chalk
description: Learn how to run and train ML models in Chalk
published: true
---

import { TipInfo } from '@/components/Tip'

---

Chalk has a tiered architecture for defining, training, and versioning machine learning models:
— **Registered Model**: A registered model is a collection of model versions. You can think of it is a logical grouping of model versions
    — a unique identifier,
    — a name,
    — a set of model versions,
    — (optional) a description,
— **Model Bundle**: A model bundle is a specific instance of a model, which has:
    — a unique identifier,
    — a parent model,
    — a version,
    — a model type (e.g. sklearn, pytorch, onnx, etc.),
    — a reference to a specific model artifact
    — (optionally) tag(s)
    — (optionally) preprocessing code (for transforming features into model inputs),
    — (optionally) prediction code (for postprocessing model outputs into features),
    — (optionally) a training configuration (for training the model),
    — (optionally) a training dataset,
    — (optionally) a validation dataset,
    — (optionally) a test dataset,
    — (optionally) a train function
— **Model Artifacts**: The weights which are typically stored in a cloud storage bucket or in a separate
    — either:
        — a single file (e.g. a pickle file, a TensorFlow SavedModel, or a PyTorch model file),
        — a load function (for loading the model from a cloud storage bucket or another registry like Wandb, Mlflow, Vertex, or Sagemaker.)

Chalk models, model versions and model artifacts are all created and managed through either the python SDK or the CLI.
They are then included in deployments using the `ChalkModel` class in the `chalk.ml` module.

Inference is run on models using the `F.inference` underscore function, which can be used to run inference on a model
version.


## Including Models in Chalk Deployments

Use the `ChalkModel` class to include trained models in your Chalk deployment:

```python
from chalk.ml import ChalkModel
from chalk import functions as F

# Load a model into the deployment
risk_model = ChalkModel(
    name="RiskScoreModel",
    tag="2025-07-29",
    load=True,  # Load model artifact into deployment
)

# Reference the loaded model in inference
@features
class User:
    id: int
    risk_score: float = F.inference(risk_model, inputs=[
        _.age,
        10,
        _.income
    ])

# Alternative: Use specific model types
rf_model = ChalkModel(
    name="RandomForestClassifier",
    tag="production",
    load=True
)

@features
class Transaction:
    id: int
    amount: float
    is_fraudulent: bool = F.sklearn_random_forest(rf_model)
```

Model objects also fully accessible through their object's path for custom python execution.
For example, you can use the model directly in a python resolver, like so:

```python
from transformers import Tokenizer
from chalk import before_all, ml

global risk_model
global tokenizer

@before_all
def before_all():
    from transformers import PreTrainedTokenizerFast

    fast_tokenizer = PreTrainedTokenizerFast(risk_model.additional_files["tokenizer.json"])
    model_executable = rick_model.load_model()
    model_executable.eval()

@online(resource_group="risk-model", resource_hint="gpu"))
def embed_transaction_memo(memo: Transaction.memo) -> Transaction.memo_embedding:
    # Use the model directly in custom code
    tokens = fast_tokenizer.encode(memo, return_tensors="pt")

    return model_executable(token)
```

## Loading an Existing Model Into Chalk

You can easily load an existing model into Chalk's model registry using the `ChalkClient`.


```python
from chalk.ml import model
from chalk import ChalkDataFrame, DataFrame
from chalk.client import ChalkClient
from sklearn.ensemble import RandomForestClassifier

client = ChalkClient()

model = RandomForestClassifier()

model.fit(X_train, y_train)

# Register a model directly from the python object
client.register_model(
    name="RiskModel",
    version="1.0.0",
    tag="v1.0",
    model=model,
    description="Model for predicting user risk scores",
    model_type="sklearn",
    model_format="pickle",
    metadata={
        ...
    }
)


# Register a model from s3 paths
mv: ModelVersion = client.register_model(
    name="RiskModel",
    version="1.0.1",
    tag="v1.0",
    model_path="s3://my-bucket/models/risk_model.pth",
    additional_files={
        "tokenizer.json": "s3://my-bucket/models/tokenizer.json"
    },
    description="Model for predicting user risk scores",
    model_type="pytorch",
    model_format="pytorch",
    input_type=...,
    output_type=...,
    metadata={
        ...
    }
)

models = client.get_model(name="RiskModel")
models.versions == [
    ModelVersion(),
    ModelVersion(),
]
```

## Remote Model Training with Chalk

```python
from chalk.ml import model
import pyarrow as pa
from chalk import ChalkDataFrame, DataFrame
from chalk.client import ChalkClient

client = ChalkClient()

@model
class FraudDetectionModel:
    # Define input features
    features = [
        Transaction.user.name,
        Transaction.user.age,
        Transaction.amount
    ]

    # Define model type
    model_type = "pytorch"

    # Define output type
    output = pa.float64()  # Fraud probability score

    def predict(self, data: ChalkDataFrame) -> pa.Array:
        """Run inference on preprocessed data"""
        model = self.load()
        predictions = model(data.to_tensor())
        return pa.array(predictions.numpy())

    def preprocess(self, df: DataFrame[self.features]) -> ChalkDataFrame:
        """Transform input features for model consumption"""
        # Normalize numerical features
        df['amount_normalized'] = df['amount'] / df['amount'].max()

        # Encode categorical features
        df['name_encoded'] = encode_categorical(df['name'])

        return ChalkDataFrame(df)

    def train(self, df: DataFrame[self.features], target: DataFrame[pa.float64], config) -> None:
        """Train the model on provided features and target"""
        model = self.load()
        # Assume model has a fit method
        model.fit(df.to_tensor(), target.to_tensor())
        self.save(model)

# Runs an offline query for FraudDetectionModel.features
raw_dataset = FraudDetectionModel.get_dataset()

# Runs preprocess on the raw dataset
dataset = FraudDetectionModel.preprocess()
```


## Training Models with Chalk

...


## Model Registry Integration

...

<TipInfo>
Models are automatically versioned and tracked in Chalk's model registry. You can revert to previous model versions without redeploying your entire Chalk deployment.
</TipInfo>

## Model Execution Modes

Configure where and how your models execute:

```python


# Execute in Chalk engine (default)
risk_score: float = F.inference(
    model_name="RiskModel",
    tag="v1.0",
)

# Execute in specific resource group
embedding: Vector[384] = F.inference(
    model_name="TextEmbeddingModel",
    tag="latest",
    resource_group="gpu-pool"
)
```
