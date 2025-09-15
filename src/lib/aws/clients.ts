import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { CostExplorerClient } from '@aws-sdk/client-cost-explorer';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { APIGatewayClient } from '@aws-sdk/client-api-gateway';
import { getAWSClientConfig } from './config';

// Singleton pattern for AWS clients to optimize performance
let cloudWatchClient: CloudWatchClient | null = null;
let cloudWatchLogsClient: CloudWatchLogsClient | null = null;
let costExplorerClient: CostExplorerClient | null = null;
let dynamoDBClient: DynamoDBClient | null = null;
let dynamoDBDocClient: DynamoDBDocumentClient | null = null;
let lambdaClient: LambdaClient | null = null;
let apiGatewayClient: APIGatewayClient | null = null;

// CloudWatch Client
export const getCloudWatchClient = (): CloudWatchClient => {
  if (!cloudWatchClient) {
    cloudWatchClient = new CloudWatchClient(getAWSClientConfig());
  }
  return cloudWatchClient;
};

// CloudWatch Logs Client
export const getCloudWatchLogsClient = (): CloudWatchLogsClient => {
  if (!cloudWatchLogsClient) {
    cloudWatchLogsClient = new CloudWatchLogsClient(getAWSClientConfig());
  }
  return cloudWatchLogsClient;
};

// Cost Explorer Client
export const getCostExplorerClient = (): CostExplorerClient => {
  if (!costExplorerClient) {
    costExplorerClient = new CostExplorerClient(getAWSClientConfig());
  }
  return costExplorerClient;
};

// DynamoDB Client
export const getDynamoDBClient = (): DynamoDBClient => {
  if (!dynamoDBClient) {
    dynamoDBClient = new DynamoDBClient(getAWSClientConfig());
  }
  return dynamoDBClient;
};

// DynamoDB Document Client (for easier JSON operations)
export const getDynamoDBDocumentClient = (): DynamoDBDocumentClient => {
  if (!dynamoDBDocClient) {
    const marshallOptions = {
      convertEmptyValues: false,
      removeUndefinedValues: true,
      convertClassInstanceToMap: false
    };

    const unmarshallOptions = {
      wrapNumbers: false
    };

    dynamoDBDocClient = DynamoDBDocumentClient.from(getDynamoDBClient(), {
      marshallOptions,
      unmarshallOptions
    });
  }
  return dynamoDBDocClient;
};

// Lambda Client
export const getLambdaClient = (): LambdaClient => {
  if (!lambdaClient) {
    lambdaClient = new LambdaClient(getAWSClientConfig());
  }
  return lambdaClient;
};

// API Gateway Client
export const getAPIGatewayClient = (): APIGatewayClient => {
  if (!apiGatewayClient) {
    apiGatewayClient = new APIGatewayClient(getAWSClientConfig());
  }
  return apiGatewayClient;
};

// Cleanup function for graceful shutdown
export const closeAllClients = async (): Promise<void> => {
  const clients = [
    cloudWatchClient,
    cloudWatchLogsClient,
    costExplorerClient,
    dynamoDBClient,
    lambdaClient,
    apiGatewayClient
  ];

  await Promise.all(
    clients.map(client => {
      if (client) {
        return client.destroy();
      }
      return Promise.resolve();
    })
  );

  // Reset all clients
  cloudWatchClient = null;
  cloudWatchLogsClient = null;
  costExplorerClient = null;
  dynamoDBClient = null;
  dynamoDBDocClient = null;
  lambdaClient = null;
  apiGatewayClient = null;
};