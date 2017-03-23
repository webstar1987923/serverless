<!--
title: Serverless Framework Commands - AWS Lambda - Invoke
menuText: Invoke
menuOrder: 4
description: Invoke an AWS Lambda Function using the Serverless Framework
layout: Doc
-->

<!-- DOCS-SITE-LINK:START automatically generated  -->
### [Read this on the main serverless docs site](https://www.serverless.com/framework/docs/providers/aws/cli-reference/invoke)
<!-- DOCS-SITE-LINK:END -->

# Invoke

Invokes a previously deployed function. It allows to send event data to the function and read logs and display other important information of the function invoke.

```bash
serverless invoke --function functionName
```

## Options
- `--function` or `-f` The name of the function in your service that you want to invoke. **Required**.
- `--stage` or `-s` The stage in your service you want to invoke your function in.
- `--region` or `-r` The region in your stage that you want to invoke your function in.
- `--path` or `-p` The path to a json file holding input data to be passed to the invoked function. This path is relative to the
root directory of the service.
- `--type` or `-t` The type of invocation. Either `RequestResponse`, `Event` or `DryRun`. Default is `RequestResponse`.
- `--log` or `-l` If set to `true` and invocation type is `RequestResponse`, it will output logging data of the invocation.
Default is `false`.

## Provided lifecycle events
- `invoke:invoke`

## Examples

### AWS

```bash
serverless invoke --function functionName --stage dev --region us-east-1
```

This example will invoke your deployed function named `functionName` in region `us-east-1` in stage `dev`. This will
output the result of the invocation in your terminal.

#### Function invocation with logging

```bash
serverless invoke --function functionName --stage dev --region us-east-1 --log
```

Just like the first example, but will also outputs logging information about your invocation.

#### Function invocation with data passing

```bash
serverless invoke --function functionName --stage dev --region us-east-1 --path lib/data.json
```

This example will pass the json data in the `lib/data.json` file (relative to the root of the service) while invoking
the specified/deployed function.