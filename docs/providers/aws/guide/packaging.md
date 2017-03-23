<!--
title: Serverless Framework Guide - AWS Lambda Guide - Packaging
menuText: Packaging
menuOrder: 11
description: How the Serverless Framework packages your AWS Lambda functions and other available options
layout: Doc
-->

<!-- DOCS-SITE-LINK:START automatically generated  -->
### [Read this on the main serverless docs site](https://www.serverless.com/framework/docs/providers/aws/guide/packaging)
<!-- DOCS-SITE-LINK:END -->

# Packaging

Sometimes you might like to have more control over your function artifacts and how they are packaged.

You can use the `package` and `exclude` configuration for more control over the packaging process.

## Exclude

Exclude allows you to define globs that will be excluded from the resulting artifact.

```
exclude:
  - tmp/**
  - .git
```

## Artifact
For complete control over the packaging process you can specify your own zip file for your service. Serverless won't zip your service if this is configured so `include` and `exclude` will be ignored.

## Example

```yaml
service: my-service
package:
  include:
    - lib
    - functions
  exclude:
    - tmp
    - .git
  artifact: path/to/my-artifact.zip
```

## Packaging functions separately

If you want even more controls over your functions for deployment you can configure them to be packaged independently. This allows you more control for optimizing your deployment. To enable individual packaging set `individually` to true in the service wide packaging settings.

Then for every function you can use the same `include/exclude/artifact` config options as you can service wide. The `include/exclude` options will be merged with the service wide options to create one `include/exclude` config per function during packaging.

```yaml
service: my-service
package:
  individually: true
  exclude:
    - excluded-by-default.json
functions:
  hello:
    handler: handler.hello
    package:
      include:
        # We're including this file so it will be in the final package of this function only
        - excluded-by-default.json
  world:
    handler: handler.hello
    package:
      exclude:
        - event.json
```
