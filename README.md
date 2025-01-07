# Chalk Docs

This repository contains the docs for https://docs.chalk.ai/docs

Documentation at https://docs.chalk.ai/cli and https://docs.chalk.ai/api-docs
is auto-generated from the tools themselves.

## Updating the Chalk CLI and Python SDK

## CLI

Update the [CLI repository](https://github.com/chalk-ai/cli/tree/main) with the new command!

Update the table of contents for the CLI: https://github.com/chalk-ai/cli/blob/main/pkg/cmd/toc.go

Cut a new release with: `make cli.release`

Run codegen GitHub action: https://github.com/chalk-ai/chalk-private/actions/workflows/codegen-cli-docs.yml

Check that the PR was created and merged; cut a release in chalk-private, then check Vercel

### Chalkpy SDK

Update the Python SDK with new functionality

Update imports e.g. https://github.com/chalk-ai/chalk/pull/2102/files

Release Chalkpy SDK: `make chalkpy.release`

https://github.com/chalk-ai/chalk/blob/main/Makefile

Update the pyproject toml in docsgen to point to the new release version: https://github.com/chalk-ai/chalk-private/blob/dev/docsgen/pyproject.toml#L27

Update the table of contents: https://github.com/chalk-ai/chalk-private/blob/dev/docsgen/docsgen/toc.py

Run docsgen github action: https://github.com/chalk-ai/chalk-private/actions/workflows/codegen-chalkpy-docs.yml

Check that the PR was created and merged; cut a release in chalk-private, then check Vercel
