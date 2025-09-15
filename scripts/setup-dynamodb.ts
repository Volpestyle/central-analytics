import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

async function createTablesIfNotExist() {
  // Sessions table
  const sessionsTable = {
    TableName: process.env.SESSIONS_TABLE || 'central-analytics-sessions',
    KeySchema: [
      { AttributeName: 'token', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'token', AttributeType: 'S' },
      { AttributeName: 'user_id', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'user_id-index',
        KeySchema: [
          { AttributeName: 'user_id', KeyType: 'HASH' }
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    TimeToLiveSpecification: {
      AttributeName: 'ttl',
      Enabled: true
    }
  };

  // Users table
  const usersTable = {
    TableName: process.env.USERS_TABLE || 'central-analytics-users',
    KeySchema: [
      { AttributeName: 'apple_sub', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'apple_sub', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  };

  // Create sessions table
  try {
    await client.send(new DescribeTableCommand({ TableName: sessionsTable.TableName }));
    console.log(`Table ${sessionsTable.TableName} already exists`);
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(`Creating table ${sessionsTable.TableName}...`);
      await client.send(new CreateTableCommand(sessionsTable));
      console.log(`Table ${sessionsTable.TableName} created successfully`);
    } else {
      throw error;
    }
  }

  // Create users table
  try {
    await client.send(new DescribeTableCommand({ TableName: usersTable.TableName }));
    console.log(`Table ${usersTable.TableName} already exists`);
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(`Creating table ${usersTable.TableName}...`);
      await client.send(new CreateTableCommand(usersTable));
      console.log(`Table ${usersTable.TableName} created successfully`);
    } else {
      throw error;
    }
  }

  console.log('\nDynamoDB tables setup complete!');
  console.log('\nNext steps:');
  console.log('1. Add your admin Apple sub to AWS Secrets Manager or Lambda environment variables');
  console.log('2. Deploy the Lambda function using the handler in server/lambda.ts');
  console.log('3. Set up API Gateway to route requests to your Lambda');
}

createTablesIfNotExist().catch(console.error);