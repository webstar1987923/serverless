'use strict';

const expect = require('chai').expect;
const AwsProvider = require('../../../../../provider/awsProvider');
const AwsCompileStreamEvents = require('../index');
const Serverless = require('../../../../../../../Serverless');

describe('AwsCompileStreamEvents', () => {
  let serverless;
  let awsCompileStreamEvents;

  beforeEach(() => {
    serverless = new Serverless();
    serverless.service.provider.compiledCloudFormationTemplate = {
      Resources: {
        IamPolicyLambdaExecution: {
          Properties: {
            PolicyDocument: {
              Statement: [],
            },
          },
        },
      },
    };
    serverless.setProvider('aws', new AwsProvider(serverless));
    awsCompileStreamEvents = new AwsCompileStreamEvents(serverless);
    awsCompileStreamEvents.serverless.service.service = 'new-service';
  });

  describe('#constructor()', () => {
    it('should set the provider variable to be an instance of AwsProvider', () =>
      expect(awsCompileStreamEvents.provider).to.be.instanceof(AwsProvider));
  });

  describe('#compileStreamEvents()', () => {
    it('should throw an error if stream event type is not a string or an object', () => {
      awsCompileStreamEvents.serverless.service.functions = {
        first: {
          events: [
            {
              stream: 42,
            },
          ],
        },
      };

      expect(() => awsCompileStreamEvents.compileStreamEvents()).to.throw(Error);
    });

    it('should throw an error if the "arn" property is not given', () => {
      awsCompileStreamEvents.serverless.service.functions = {
        first: {
          events: [
            {
              stream: {
                arn: null,
              },
            },
          ],
        },
      };

      expect(() => awsCompileStreamEvents.compileStreamEvents()).to.throw(Error);
    });

    describe('when a DynamoDB stream ARN is given', () => {
      it('should create event source mappings when a DynamoDB stream ARN is given', () => {
        awsCompileStreamEvents.serverless.service.functions = {
          first: {
            events: [
              {
                stream: {
                  arn: 'arn:aws:dynamodb:region:account:table/foo/stream/1',
                  batchSize: 1,
                  startingPosition: 'STARTING_POSITION_ONE',
                  enabled: false,
                },
              },
              {
                stream: {
                  arn: 'arn:aws:dynamodb:region:account:table/bar/stream/2',
                },
              },
              {
                stream: 'arn:aws:dynamodb:region:account:table/baz/stream/3',
              },
            ],
          },
        };

        awsCompileStreamEvents.compileStreamEvents();

        // event 1
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingDynamodbFoo
          .Type
        ).to.equal('AWS::Lambda::EventSourceMapping');
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingDynamodbFoo
          .DependsOn
        ).to.equal('IamPolicyLambdaExecution');
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingDynamodbFoo
          .Properties.EventSourceArn
        ).to.equal(
          awsCompileStreamEvents.serverless.service.functions.first.events[0]
          .stream.arn
        );
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingDynamodbFoo
          .Properties.BatchSize
        ).to.equal(
          awsCompileStreamEvents.serverless.service.functions.first.events[0]
          .stream.batchSize
        );
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingDynamodbFoo
          .Properties.StartingPosition
        ).to.equal(
          awsCompileStreamEvents.serverless.service.functions.first.events[0]
          .stream.startingPosition
        );
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingDynamodbFoo
          .Properties.Enabled
        ).to.equal('False');

        // event 2
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingDynamodbBar
          .Type
        ).to.equal('AWS::Lambda::EventSourceMapping');
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingDynamodbBar
          .DependsOn
        ).to.equal('IamPolicyLambdaExecution');
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingDynamodbBar
          .Properties.EventSourceArn
        ).to.equal(
          awsCompileStreamEvents.serverless.service.functions.first.events[1]
          .stream.arn
        );
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingDynamodbBar
          .Properties.BatchSize
        ).to.equal(10);
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingDynamodbBar
          .Properties.StartingPosition
        ).to.equal('TRIM_HORIZON');
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingDynamodbBar
          .Properties.Enabled
        ).to.equal('True');

        // event 3
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingDynamodbBaz
          .Type
        ).to.equal('AWS::Lambda::EventSourceMapping');
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingDynamodbBaz
          .DependsOn
        ).to.equal('IamPolicyLambdaExecution');
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingDynamodbBaz
          .Properties.EventSourceArn
        ).to.equal(
          awsCompileStreamEvents.serverless.service.functions.first.events[2]
          .stream
        );
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingDynamodbBaz
          .Properties.BatchSize
        ).to.equal(10);
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingDynamodbBaz
          .Properties.StartingPosition
        ).to.equal('TRIM_HORIZON');
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingDynamodbBaz
          .Properties.Enabled
        ).to.equal('True');
      });

      it('should add the necessary IAM role statements', () => {
        awsCompileStreamEvents.serverless.service.functions = {
          first: {
            events: [
              {
                stream: 'arn:aws:dynamodb:region:account:table/foo/stream/1',
              },
            ],
          },
        };

        const iamRoleStatements = [
          {
            Effect: 'Allow',
            Action: [
              'dynamodb:GetRecords',
              'dynamodb:GetShardIterator',
              'dynamodb:DescribeStream',
              'dynamodb:ListStreams',
            ],
            Resource: 'arn:aws:dynamodb:region:account:table/foo/stream/1',
          },
        ];

        awsCompileStreamEvents.compileStreamEvents();

        expect(awsCompileStreamEvents.serverless.service.provider
          .compiledCloudFormationTemplate.Resources
          .IamPolicyLambdaExecution.Properties
          .PolicyDocument.Statement
        ).to.deep.equal(iamRoleStatements);
      });
    });

    describe('when a Kinesis stream ARN is given', () => {
      it('should create event source mappings when a Kinesis stream ARN is given', () => {
        awsCompileStreamEvents.serverless.service.functions = {
          first: {
            events: [
              {
                stream: {
                  arn: 'arn:aws:kinesis:region:account:stream/foo',
                  batchSize: 1,
                  startingPosition: 'STARTING_POSITION_ONE',
                  enabled: false,
                },
              },
              {
                stream: {
                  arn: 'arn:aws:kinesis:region:account:stream/bar',
                },
              },
              {
                stream: 'arn:aws:kinesis:region:account:stream/baz',
              },
            ],
          },
        };

        awsCompileStreamEvents.compileStreamEvents();

        // event 1
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingKinesisFoo
          .Type
        ).to.equal('AWS::Lambda::EventSourceMapping');
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingKinesisFoo
          .DependsOn
        ).to.equal('IamPolicyLambdaExecution');
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingKinesisFoo
          .Properties.EventSourceArn
        ).to.equal(
          awsCompileStreamEvents.serverless.service.functions.first.events[0]
          .stream.arn
        );
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingKinesisFoo
          .Properties.BatchSize
        ).to.equal(
          awsCompileStreamEvents.serverless.service.functions.first.events[0]
          .stream.batchSize
        );
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingKinesisFoo
          .Properties.StartingPosition
        ).to.equal(
          awsCompileStreamEvents.serverless.service.functions.first.events[0]
          .stream.startingPosition
        );
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingKinesisFoo
          .Properties.Enabled
        ).to.equal('False');

        // event 2
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingKinesisBar
          .Type
        ).to.equal('AWS::Lambda::EventSourceMapping');
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingKinesisBar
          .DependsOn
        ).to.equal('IamPolicyLambdaExecution');
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingKinesisBar
          .Properties.EventSourceArn
        ).to.equal(
          awsCompileStreamEvents.serverless.service.functions.first.events[1]
          .stream.arn
        );
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingKinesisBar
          .Properties.BatchSize
        ).to.equal(10);
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingKinesisBar
          .Properties.StartingPosition
        ).to.equal('TRIM_HORIZON');
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingKinesisBar
          .Properties.Enabled
        ).to.equal('True');

        // event 3
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingKinesisBaz
          .Type
        ).to.equal('AWS::Lambda::EventSourceMapping');
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingKinesisBaz
          .DependsOn
        ).to.equal('IamPolicyLambdaExecution');
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingKinesisBaz
          .Properties.EventSourceArn
        ).to.equal(
          awsCompileStreamEvents.serverless.service.functions.first.events[2]
          .stream
        );
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingKinesisBaz
          .Properties.BatchSize
        ).to.equal(10);
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingKinesisBaz
          .Properties.StartingPosition
        ).to.equal('TRIM_HORIZON');
        expect(awsCompileStreamEvents.serverless.service
          .provider.compiledCloudFormationTemplate.Resources.FirstEventSourceMappingKinesisBaz
          .Properties.Enabled
        ).to.equal('True');
      });

      it('should add the necessary IAM role statements', () => {
        awsCompileStreamEvents.serverless.service.functions = {
          first: {
            events: [
              {
                stream: 'arn:aws:kinesis:region:account:stream/foo',
              },
            ],
          },
        };

        const iamRoleStatements = [
          {
            Effect: 'Allow',
            Action: [
              'kinesis:GetRecords',
              'kinesis:GetShardIterator',
              'kinesis:DescribeStream',
              'kinesis:ListStreams',
            ],
            Resource: 'arn:aws:kinesis:region:account:stream/foo',
          },
        ];

        awsCompileStreamEvents.compileStreamEvents();

        expect(awsCompileStreamEvents.serverless.service.provider
          .compiledCloudFormationTemplate.Resources
          .IamPolicyLambdaExecution.Properties
          .PolicyDocument.Statement
        ).to.deep.equal(iamRoleStatements);
      });
    });

    it('should not create event source mapping when stream events are not given', () => {
      awsCompileStreamEvents.serverless.service.functions = {
        first: {
          events: [],
        },
      };

      awsCompileStreamEvents.compileStreamEvents();

      // should be 1 because we've mocked the IamPolicyLambdaExecution above
      expect(
        Object.keys(awsCompileStreamEvents.serverless.service.provider
          .compiledCloudFormationTemplate.Resources).length
      ).to.equal(1);
    });

    it('should not add the IAM role statements when stream events are not given', () => {
      awsCompileStreamEvents.serverless.service.functions = {
        first: {
          events: [],
        },
      };

      awsCompileStreamEvents.compileStreamEvents();

      expect(
        awsCompileStreamEvents.serverless.service.provider
          .compiledCloudFormationTemplate.Resources
          .IamPolicyLambdaExecution.Properties
          .PolicyDocument.Statement.length
      ).to.equal(0);
    });

    it('should remove all non-alphanumerics from stream names for the resource logical ids', () => {
      awsCompileStreamEvents.serverless.service.functions = {
        first: {
          events: [
            {
              stream: 'arn:aws:kinesis:region:account:stream/some-long-name',
            },
          ],
        },
      };

      awsCompileStreamEvents.compileStreamEvents();

      expect(awsCompileStreamEvents.serverless.service
        .provider.compiledCloudFormationTemplate.Resources
      ).to.have.any.keys('FirstEventSourceMappingKinesisSomelongname');
    });
  });
});
