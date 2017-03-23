'use strict';

const _ = require('lodash');
const path = require('path');

class AwsCompileFunctions {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.provider = this.serverless.getProvider('aws');

    this.compileFunctions = this.compileFunctions.bind(this);
    this.compileFunction = this.compileFunction.bind(this);

    this.hooks = {
      'deploy:compileFunctions': this.compileFunctions,
    };
  }

  compileFunction(functionName) {
    const newFunction = this.cfLambdaFunctionTemplate();
    const functionObject = this.serverless.service.getFunction(functionName);

    const artifactFilePath = this.serverless.service.package.individually ?
      functionObject.artifact :
      this.serverless.service.package.artifact;

    if (!artifactFilePath) {
      throw new Error(`No artifact path is set for function: "${functionName}"`);
    }

    if (this.serverless.service.package.deploymentBucket) {
      newFunction.Properties.Code.S3Bucket = this.serverless.service.package.deploymentBucket;
    }

    const s3Folder = this.serverless.service.package.artifactDirectoryName;
    const s3FileName = artifactFilePath.split(path.sep).pop();
    newFunction.Properties.Code.S3Key = `${s3Folder}/${s3FileName}`;

    if (!functionObject.handler) {
      const errorMessage = [
        `Missing "handler" property in function ""${functionName}".`,
        ' Please make sure you point to the correct lambda handler.',
        ' For example: handler.hello.',
        ' Please check the docs for more info',
      ].join('');
      throw new this.serverless.classes
        .Error(errorMessage);
    }

    const Handler = functionObject.handler;
    const FunctionName = functionObject.name;
    const MemorySize = Number(functionObject.memorySize)
      || Number(this.serverless.service.provider.memorySize)
      || 1024;
    const Timeout = Number(functionObject.timeout)
      || Number(this.serverless.service.provider.timeout)
      || 6;
    const Runtime = functionObject.runtime
      || this.serverless.service.provider.runtime
      || 'nodejs4.3';

    newFunction.Properties.Handler = Handler;
    newFunction.Properties.FunctionName = FunctionName;
    newFunction.Properties.MemorySize = MemorySize;
    newFunction.Properties.Timeout = Timeout;
    newFunction.Properties.Runtime = Runtime;

    if (functionObject.description) {
      newFunction.Properties.Description = functionObject.description;
    }

    if (typeof this.serverless.service.provider.iamRoleARN === 'string') {
      newFunction.Properties.Role = this.serverless.service.provider.iamRoleARN;
    } else {
      newFunction.Properties.Role = { 'Fn::GetAtt': ['IamRoleLambdaExecution', 'Arn'] };
    }

    if (!functionObject.vpc) functionObject.vpc = {};
    if (!this.serverless.service.provider.vpc) this.serverless.service.provider.vpc = {};

    newFunction.Properties.VpcConfig = {
      SecurityGroupIds: functionObject.vpc.securityGroupIds ||
      this.serverless.service.provider.vpc.securityGroupIds,
      SubnetIds: functionObject.vpc.subnetIds || this.serverless.service.provider.vpc.subnetIds,
    };

    if (!newFunction.Properties.VpcConfig.SecurityGroupIds
      || !newFunction.Properties.VpcConfig.SubnetIds) {
      delete newFunction.Properties.VpcConfig;
    }

    const normalizedFunctionName = functionName[0].toUpperCase() + functionName.substr(1);
    const functionLogicalId = `${normalizedFunctionName}LambdaFunction`;
    const newFunctionObject = {
      [functionLogicalId]: newFunction,
    };

    _.merge(this.serverless.service.provider.compiledCloudFormationTemplate.Resources,
      newFunctionObject);

    // Add function to Outputs section
    const newOutput = this.cfOutputDescriptionTemplate();
    newOutput.Value = { 'Fn::GetAtt': [functionLogicalId, 'Arn'] };

    const newOutputObject = {
      [`${functionLogicalId}Arn`]: newOutput,
    };

    _.merge(this.serverless.service.provider.compiledCloudFormationTemplate.Outputs,
      newOutputObject);
  }

  compileFunctions() {
    this.serverless.service
      .getAllFunctions()
      .forEach((functionName) => this.compileFunction(functionName));
  }

  // Helper functions
  cfLambdaFunctionTemplate() {
    return {
      Type: 'AWS::Lambda::Function',
      Properties: {
        Code: {
          S3Bucket: {
            Ref: 'ServerlessDeploymentBucket',
          },
          S3Key: 'S3Key',
        },
        FunctionName: 'FunctionName',
        Handler: 'Handler',
        MemorySize: 'MemorySize',
        Role: 'Role',
        Runtime: 'Runtime',
        Timeout: 'Timeout',
      },
    };
  }

  cfOutputDescriptionTemplate() {
    return {
      Description: 'Lambda function info',
      Value: 'Value',
    };
  }
}

module.exports = AwsCompileFunctions;
