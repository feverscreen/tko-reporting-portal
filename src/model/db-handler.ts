import {
  DynamoDBClient,
  UpdateItemCommand,
  UpdateItemCommandInput,
  GetItemCommand,
  GetItemCommandInput,
  BatchGetItemCommand,
  BatchGetItemCommandInput,
  PutItemCommand,
  PutItemCommandInput,
  DeleteItemCommand,
  DeleteItemCommandInput,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
  ServiceInputTypes,
  ServiceOutputTypes,
} from "@aws-sdk/client-dynamodb";
import { Command, HttpHandlerOptions } from "@aws-sdk/types";
import { SmithyResolvedConfiguration } from "@aws-sdk/smithy-client";
import { REGION as region } from "@/constants";
import { CognitoIdentityCredentialProvider } from "@aws-sdk/credential-provider-cognito-identity";

export interface Device {
  name: string;
  id: string;
  alerts: boolean;
}

export interface EventTableItem {
  displayedTemperature: number;
  threshold: number;
  result: "Fever" | "Normal" | "Error";
  timestamp: Date;
  device: string;
  time: string;
  [key: string]: string | number | Date;
}

export interface DynamoEventItem {
  disp: number;
  fth: number;
  tsc: string;
  uid: string;
}

export default function DatabaseHandler(
  auth: CognitoIdentityCredentialProvider,
  userId: string
) {
  return {
    ddbClient: new DynamoDBClient({ region, credentials: auth }),
    async dbsend<
      ClientInput extends ServiceInputTypes,
      ClientOutput extends ServiceOutputTypes
    >(
      command: Command<
        ServiceInputTypes,
        ClientInput,
        ServiceOutputTypes,
        ClientOutput,
        SmithyResolvedConfiguration<HttpHandlerOptions>
      >
    ) {
      try {
        const data = await this.ddbClient.send<ClientInput, ClientOutput>(
          command
        );
        return data;
      } catch (e) {
        console.error(e);
      }
    },
    getItem(params: GetItemCommandInput) {
      return this.dbsend(new GetItemCommand(params));
    },
    batchGetItem(params: BatchGetItemCommandInput) {
      return this.dbsend(new BatchGetItemCommand(params));
    },
    query(params: QueryCommandInput) {
      return this.dbsend(new QueryCommand(params));
    },
    putItem(params: PutItemCommandInput) {
      return this.dbsend(new PutItemCommand(params));
    },
    deleteItem(params: DeleteItemCommandInput) {
      return this.dbsend(new DeleteItemCommand(params));
    },
    updateItem(params: UpdateItemCommandInput) {
      return this.dbsend(new UpdateItemCommand(params));
    },
    async getDevices() {
      const TableName = "UserDevices";
      const params = {
        TableName,
        ExpressionAttributeValues: {
          ":user": {
            S: userId,
          },
        },
        KeyConditionExpression: "Username = :user ",
        ProjectionExpression: "DeviceId, UserDeviceName, AlertsEnabled",
      };
      const query = await this.query(params);
      const devices = query?.Items ?? [];

      return {
        ...devices.map(({ DeviceId, UserDeviceName, AlertsEnabled }) => ({
          [DeviceId.S as string]: {
            id: DeviceId.S,
            name: (UserDeviceName && UserDeviceName.S) || DeviceId.S,
            alerts: (AlertsEnabled && AlertsEnabled.S === "true") || false,
          },
        })),
      };
    },
    async updateDeviceName(device: string, newName: string) {
      const params = {
        TableName: "UserDevices",
        Key: {
          ["Username"]: { S: userId },
          ["DeviceId"]: { S: device },
        },
        UpdateExpression: "set UserDeviceName = :udn",
        ExpressionAttributeValues: {
          ":udn": {
            S: newName,
          },
        },
        ReturnValues: "UPDATED_NEW",
      };
      const query = this.updateItem(params);

      return query;
    },
    async getDeviceEvents(
      device: string,
      timeFrame: { start: string; end?: string }
    ): Promise<EventTableItem[]> {
      const params = {
        TableName: "Events",
        KeyConditionExpression: "uid = :id AND sort BETWEEN :start and :end",
        ExpressionAttributeValues: {
          ":id": { S: device },
          ":start": { S: "Screen|2020-12-04T02_32_36_764Z" },
          ":end": { S: "Screen|2020-12-08T23_08_49_072Z" },
        },
      };
      const query = await this.query(params);
      console.log(query);

      return [];
    },
  };
}
