'use strict';

const sinon = require('sinon');
const BbPromise = require('bluebird');
const expect = require('chai').expect;
const Serverless = require('../../../Serverless');
const AwsProvider = require('./awsProvider');
const proxyquire = require('proxyquire');

describe('AwsProvider', () => {
  let awsProvider;
  let serverless;

  beforeEach(() => {
    const options = {
      stage: 'dev',
      region: 'us-east-1',
    };
    serverless = new Serverless(options);
    awsProvider = new AwsProvider(serverless, options);
    awsProvider.serverless.cli = new serverless.classes.CLI();
  });

  describe('#getProviderName()', () => {
    it('should return the provider name', () => {
      expect(AwsProvider.getProviderName()).to.equal('aws');
    });
  });

  describe('#constructor()', () => {
    it('should set Serverless instance', () => {
      expect(typeof awsProvider.serverless).to.not.equal('undefined');
    });

    it('should set AWS instance', () => {
      expect(typeof awsProvider.sdk).to.not.equal('undefined');
    });

    it('should set the provider property', () => {
      expect(awsProvider.provider).to.equal(awsProvider);
    });

    it('should set AWS proxy', () => {
      process.env.proxy = 'http://a.b.c.d:n';
      const newAwsProvider = new AwsProvider(serverless);

      expect(typeof newAwsProvider.sdk.config.httpOptions.agent).to.not.equal('undefined');

      // clear env
      delete process.env.proxy;
    });

    it('should set AWS timeout', () => {
      process.env.AWS_CLIENT_TIMEOUT = '120000';
      const newAwsProvider = new AwsProvider(serverless);

      expect(typeof newAwsProvider.sdk.config.httpOptions.timeout).to.not.equal('undefined');

      // clear env
      delete process.env.AWS_CLIENT_TIMEOUT;
    });
  });

  describe('#request()', () => {
    it('should call correct aws method', () => {
      // mocking S3 for testing
      class FakeS3 {
        constructor(credentials) {
          this.credentials = credentials;
        }

        putObject() {
          return {
            send: (cb) => cb(null, { called: true }),
          };
        }
      }
      awsProvider.sdk = {
        S3: FakeS3,
      };
      awsProvider.serverless.service.environment = {
        vars: {},
        stages: {
          dev: {
            vars: {
              profile: 'default',
            },
            regions: {},
          },
        },
      };

      return awsProvider.request('S3', 'putObject', {}, 'dev', 'us-east-1').then(data => {
        expect(data.called).to.equal(true);
      });
    });

    it('should retry if error code is 429', function (done) {
      this.timeout(10000);
      let first = true;
      const error = {
        statusCode: 429,
        message: 'Testing retry',
      };
      class FakeS3 {
        constructor(credentials) {
          this.credentials = credentials;
        }

        error() {
          return {
            send(cb) {
              if (first) {
                cb(error);
              } else {
                cb(undefined, {});
              }
              first = false;
            },
          };
        }
      }
      awsProvider.sdk = {
        S3: FakeS3,
      };
      awsProvider.request('S3', 'error', {}, 'dev', 'us-east-1')
        .then(data => {
          // eslint-disable-next-line no-unused-expressions
          expect(data).to.exist;
          // eslint-disable-next-line no-unused-expressions
          expect(first).to.be.false;
          done();
        })
        .catch(done);
    });

    it('should reject errors', (done) => {
      const error = {
        statusCode: 500,
        message: 'Some error message',
      };
      class FakeS3 {
        constructor(credentials) {
          this.credentials = credentials;
        }

        error() {
          return {
            send(cb) {
              cb(error);
            },
          };
        }
      }
      awsProvider.sdk = {
        S3: FakeS3,
      };
      awsProvider.request('S3', 'error', {}, 'dev', 'us-east-1')
        .then(() => done('Should not succeed'))
        .catch(() => done());
    });

    it('should return ref to docs for missing credentials', (done) => {
      const error = {
        statusCode: 403,
        message: 'Missing credentials in config',
      };
      class FakeS3 {
        constructor(credentials) {
          this.credentials = credentials;
        }

        error() {
          return {
            send(cb) {
              cb(error);
            },
          };
        }
      }
      awsProvider.sdk = {
        S3: FakeS3,
      };
      awsProvider.request('S3', 'error', {}, 'dev', 'us-east-1')
        .then(() => done('Should not succeed'))
        .catch((err) => {
          expect(err.message).to.contain('https://git.io/viZAC');
          done();
        })
        .catch(done);
    });
  });

  describe('#getCredentials()', () => {
    const mockCreds = (configParam) => {
      const config = configParam;
      delete config.credentials;
      return config;
    };
    const awsStub = sinon.stub().returns();
    const AwsProviderProxyquired = proxyquire('./awsProvider.js', {
      'aws-sdk': awsStub,
    });

    let newAwsProvider;

    beforeEach(() => {
      newAwsProvider = new AwsProviderProxyquired(serverless);
    });

    it('should set region for credentials', () => {
      const credentials = newAwsProvider.getCredentials('teststage', 'testregion');
      expect(credentials.region).to.equal('testregion');
    });

    it('should get credentials from provider', () => {
      serverless.service.provider.profile = 'notDefault';
      const credentials = newAwsProvider.getCredentials();
      expect(credentials.credentials.profile).to.equal('notDefault');
    });

    it('should not set credentials if empty profile is set', () => {
      serverless.service.provider.profile = '';
      const credentials = mockCreds(newAwsProvider.getCredentials('teststage', 'testregion'));
      expect(credentials).to.eql({ region: 'testregion' });
    });

    it('should not set credentials if credentials is an empty object', () => {
      serverless.service.provider.credentials = {};
      const credentials = mockCreds(newAwsProvider.getCredentials('teststage', 'testregion'));
      expect(credentials).to.eql({ region: 'testregion' });
    });

    it('should not set credentials if credentials has undefined values', () => {
      serverless.service.provider.credentials = {
        accessKeyId: undefined,
        secretAccessKey: undefined,
        sessionToken: undefined,
      };
      const credentials = mockCreds(newAwsProvider.getCredentials('teststage', 'testregion'));
      expect(credentials).to.eql({ region: 'testregion' });
    });

    it('should not set credentials if credentials has empty string values', () => {
      serverless.service.provider.credentials = {
        accessKeyId: '',
        secretAccessKey: '',
        sessionToken: '',
      };
      const credentials = mockCreds(newAwsProvider.getCredentials('teststage', 'testregion'));
      expect(credentials).to.eql({ region: 'testregion' });
    });

    it('should get credentials from provider declared credentials', () => {
      const tmpAccessKeyID = process.env.AWS_ACCESS_KEY_ID;
      const tmpAccessKeySecret = process.env.AWS_SECRET_ACCESS_KEY;
      const tmpSessionToken = process.env.AWS_SESSION_TOKEN;

      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_SESSION_TOKEN;

      serverless.service.provider.credentials = {
        accessKeyId: 'accessKeyId',
        secretAccessKey: 'secretAccessKey',
        sessionToken: 'sessionToken',
      };
      const credentials = newAwsProvider.getCredentials('teststage', 'testregion');
      expect(credentials.credentials).to.deep.eql(serverless.service.provider.credentials);

      process.env.AWS_ACCESS_KEY_ID = tmpAccessKeyID;
      process.env.AWS_SECRET_ACCESS_KEY = tmpAccessKeySecret;
      process.env.AWS_SESSION_TOKEN = tmpSessionToken;
    });

    it('should get credentials from environment declared for-all-stages credentials', () => {
      const prevVal = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN,
      };
      const testVal = {
        accessKeyId: 'accessKeyId',
        secretAccessKey: 'secretAccessKey',
        sessionToken: 'sessionToken',
      };
      process.env.AWS_ACCESS_KEY_ID = testVal.accessKeyId;
      process.env.AWS_SECRET_ACCESS_KEY = testVal.secretAccessKey;
      process.env.AWS_SESSION_TOKEN = testVal.sessionToken;
      const credentials = newAwsProvider.getCredentials('teststage', 'testregion');
      process.env.AWS_ACCESS_KEY_ID = prevVal.accessKeyId;
      process.env.AWS_SECRET_ACCESS_KEY = prevVal.secretAccessKey;
      process.env.AWS_SESSION_TOKEN = prevVal.sessionToken;
      expect(credentials.credentials).to.deep.eql(testVal);
    });

    it('should get credentials from environment declared stage specific credentials', () => {
      const prevVal = {
        accessKeyId: process.env.AWS_TESTSTAGE_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_TESTSTAGE_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_TESTSTAGE_SESSION_TOKEN,
      };
      const testVal = {
        accessKeyId: 'accessKeyId',
        secretAccessKey: 'secretAccessKey',
        sessionToken: 'sessionToken',
      };
      process.env.AWS_TESTSTAGE_ACCESS_KEY_ID = testVal.accessKeyId;
      process.env.AWS_TESTSTAGE_SECRET_ACCESS_KEY = testVal.secretAccessKey;
      process.env.AWS_TESTSTAGE_SESSION_TOKEN = testVal.sessionToken;
      const credentials = newAwsProvider.getCredentials('teststage', 'testregion');
      process.env.AWS_TESTSTAGE_ACCESS_KEY_ID = prevVal.accessKeyId;
      process.env.AWS_TESTSTAGE_SECRET_ACCESS_KEY = prevVal.secretAccessKey;
      process.env.AWS_TESTSTAGE_SESSION_TOKEN = prevVal.sessionToken;
      expect(credentials.credentials).to.deep.eql(testVal);
    });

    it('should not set credentials if profile is not set', () => {
      serverless.service.provider.profile = undefined;
      const credentials = mockCreds(newAwsProvider.getCredentials('teststage', 'testregion'));
      expect(credentials).to.eql({ region: 'testregion' });
    });

    it('should not set credentials if empty profile is set', () => {
      serverless.service.provider.profile = '';
      const credentials = mockCreds(newAwsProvider.getCredentials('teststage', 'testregion'));
      expect(credentials).to.eql({ region: 'testregion' });
    });

    it('should get credentials from provider declared profile', () => {
      serverless.service.provider.profile = 'notDefault';
      const credentials = newAwsProvider.getCredentials();
      expect(credentials.credentials.profile).to.equal('notDefault');
    });

    it('should get credentials from environment declared for-all-stages profile', () => {
      const prevVal = process.env.AWS_PROFILE;
      process.env.AWS_PROFILE = 'notDefault';
      const credentials = newAwsProvider.getCredentials();
      process.env.AWS_PROFILE = prevVal;
      expect(credentials.credentials.profile).to.equal('notDefault');
    });

    it('should get credentials from environment declared stage-specific profile', () => {
      const prevVal = process.env.AWS_TESTSTAGE_PROFILE;
      process.env.AWS_TESTSTAGE_PROFILE = 'notDefault';
      const credentials = newAwsProvider.getCredentials('teststage', 'testregion');
      process.env.AWS_TESTSTAGE_PROFILE = prevVal;
      expect(credentials.credentials.profile).to.equal('notDefault');
    });
  });

  describe('#getServerlessDeploymentBucketName', () => {
    it('should return the name of the serverless deployment bucket', () => {
      const options = {
        stage: 'dev',
        region: 'us-east-1',
      };

      const describeStackResourcesStub = sinon
        .stub(awsProvider, 'request')
        .returns(BbPromise.resolve({
          StackResourceDetail: {
            PhysicalResourceId: 'serverlessDeploymentBucketName',
          },
        }));

      return awsProvider.getServerlessDeploymentBucketName(options.stage, options.region)
        .then((bucketName) => {
          expect(bucketName).to.equal('serverlessDeploymentBucketName');
          expect(describeStackResourcesStub.calledOnce).to.be.equal(true);
          expect(describeStackResourcesStub.calledWithExactly(
            'CloudFormation',
            'describeStackResource',
            {
              StackName: `${awsProvider.serverless.service.service}-${options.stage}`,
              LogicalResourceId: 'ServerlessDeploymentBucket',
            },
            options.stage,
            options.region
          )).to.be.equal(true);
          awsProvider.request.restore();
        });
    });

    it('should return the name of the custom deployment bucket', () => {
      awsProvider.serverless.service.provider.deploymentBucket = 'custom-bucket';
      const options = {
        stage: 'dev',
        region: 'us-east-1',
      };

      const describeStackResourcesStub = sinon
        .stub(awsProvider, 'request')
        .returns(BbPromise.resolve({
          StackResourceDetail: {
            PhysicalResourceId: 'serverlessDeploymentBucketName',
          },
        }));

      return awsProvider.getServerlessDeploymentBucketName(options.stage, options.region)
        .then((bucketName) => {
          expect(describeStackResourcesStub.called).to.be.equal(false);
          expect(bucketName).to.equal('custom-bucket');
          awsProvider.request.restore();
        });
    });
  });

  describe('#getStackName', () => {
    it('should return the stack name', () => {
      serverless.service.service = 'myservice';

      expect(awsProvider.getStackName('dev')).to.equal('myservice-dev');
    });
  });
});
