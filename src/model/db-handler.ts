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
  disable: boolean;
}

export interface User {
  username: string;
  email: string;
  confirmed: boolean;
  devices: Record<string, Device>;
  group?: string;
  users?: string;
}

export interface DBUserInfo {
  Confirmed: {BOOL: boolean};
  Email: {S: string};
  Group?: {S: string};
  Username: {S: string};
  Users?: {SS: string[]};
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
  userId: string,
  auth: CognitoIdentityCredentialProvider,
  admin = false
) {
  const ddbClient = new DynamoDBClient({ region, credentials: auth });
  const dbsend = async <
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
  ) => {
    try {
      const data = await ddbClient.send<ClientInput, ClientOutput>(command);
      return data;
    } catch (e) {
      console.error(e);
    }
  };
  const getItem = (params: GetItemCommandInput) => {
    return dbsend(new GetItemCommand(params));
  };
  const batchGetItem = (params: BatchGetItemCommandInput) => {
    return dbsend(new BatchGetItemCommand(params));
  };
  const query = (params: QueryCommandInput) => {
    return dbsend(new QueryCommand(params));
  };
  const putItem = (params: PutItemCommandInput) => {
    return dbsend(new PutItemCommand(params));
  };
  const deleteItem = (params: DeleteItemCommandInput) => {
    return dbsend(new DeleteItemCommand(params));
  };
  const updateItem = (params: UpdateItemCommandInput) => {
    return dbsend(new UpdateItemCommand(params));
  };
  const updateDeviceDisable = async (user: string, device: string, disable: boolean): Promise<boolean> => {
      const params = {
        TableName: "UserDevices",
        Key: {
          ["Username"]: { S: user},
          ["DeviceId"]: { S: device },
        },
        UpdateExpression: "set Disabled = :dis",
        ExpressionAttributeValues: {
          ":dis": {
            BOOL: disable
          },
        },
        ReturnValues: "UPDATED_NEW",
      }
      const result = await updateItem(params);
      const toggle = result?.Attributes?.Disabled.BOOL

      return toggle ? toggle : false;
    }

  const putDevice = async (user = userId, device: Device) => {
      const params = {
        TableName: "UserDevices",
        Item: {
          'Username' : {S: user},
          'DeviceId' : {S: device.id}
        }
      }
      const result = await putItem(params);
    }

  return {
    async getDevices(user = userId): Promise<Record<string, Device>> {
      const TableName = "UserDevices";
      const params = {
        TableName,
        ExpressionAttributeValues: {
          ":user": {
            S: user,
          },
        },
        KeyConditionExpression: "Username = :user ",
        ProjectionExpression: "DeviceId, UserDeviceName, AlertsEnabled, Disabled",
      };
      const result = await query(params);
      const devices = result?.Items ?? [];

      return Object.assign(
        {},
        ...devices.map(({ DeviceId, UserDeviceName, AlertsEnabled, Disabled }) => ({
          [DeviceId.S as string]: {
            id: DeviceId.S as string,
            name: ((UserDeviceName && UserDeviceName.S) ||
              DeviceId.S) as string,
            alerts: (AlertsEnabled && AlertsEnabled.S === "true") || false,
            disable: Disabled && Disabled.BOOL
          } as Device,
        }))
      );
    },
    async updateDeviceName( device: string, newName: string) {
      const params = {
        TableName: "UserDevices",
        Key: {
          ["Username"]: { S: userId},
          ["DeviceId"]: { S: device },
        },
        UpdateExpression: "set UserDeviceName = :udn",
        ExpressionAttributeValues: {
          ":udn": {
            S: newName.length > 0 ? newName : device,
          },
        },
        ReturnValues: "UPDATED_NEW",
      };
      const result = await updateItem(params);

      return result;
    },
    async updateDeviceAlerts(device: string, alert: boolean) {
      console.log(device);
      const params = {
        TableName: "UserDevices",
        Key: {
          ["Username"]: { S: userId },
          ["DeviceId"]: { S: device },
        },
        UpdateExpression: "set AlertsEnabled = :ae",
        ExpressionAttributeValues: {
          ":ae": {
            S: alert ? "true" : "false",
          },
        },
        ReturnValues: "UPDATED_NEW",
      };
      const result = await updateItem(params);

      return result;
    },
    async getInvitedUsers(user = admin ? "USERS" : userId): Promise<User[]> {
      const params = {
        TableName: "Users",
        Key: {"Username": {"S": user}},
        AttributesToGet: ["Username", "Email", "Confirmed", "Users"]
      };
      const result = await getItem(params);
      const userIds = result?.Item?.Users?.SS
      if (userIds) {
        const info = await this.getUserInfo(userIds)
        const users = info.sort((a, b) => {
          const n1 = a.email.toLowerCase();
          const n2 = b.email.toLowerCase();
          return n1 < n2 ? -1 : n1 > n2 ? 1 : 0;
        })

        return users 
      }

      return [];
    },
    async getUserInfo(ids: string[]): Promise<User[]> {
      const params = {
        RequestItems:{ "Users": {
          Keys: ids.map(id => ({"Username": {"S": id}, })),
          AttributesToGet: ["Username", "Email", "Confirmed"]
        }
      }};
      const result = await batchGetItem(params);
      const info = result?.Responses?.Users as DBUserInfo[] | undefined;
      if (info) {
        return Promise.all(info.map(async ({Username, Confirmed, Email, Group, Users}) => {
          const devices = await this.getDevices(Username.S);
          return {
            username: Username.S,
            confirmed: Confirmed.BOOL,
            email: Email.S,
            group: Group?.S,
            users: Users?.SS,
            devices
          } as User
        }))
      }

      return [];
    },
    async toggleDeviceForUser(device: Device, user: User) {
      console.log(device, user);
      const {id: deviceId} = device;
      const {username} = user;
      const userDevice = Object.values(user.devices).find(({id}) => id === deviceId);
      if (userDevice) {
        const disabled = await updateDeviceDisable(username, deviceId, !userDevice.disable)
        if (username === userId) {
          console.log(disabled);
          device.disable = disabled
        }
        userDevice.disable = disabled;
      } else {
        await putDevice(username, device);
      }
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
      const result = await query(params);

      return result ? [] : [];
    },
  };
}
