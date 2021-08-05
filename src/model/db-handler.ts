import clientDynamodb, {DynamoDBClient, GetItemCommand, BatchGetItemCommand, QueryCommand, PutItemCommand, DeleteItemCommand, UpdateItemCommand} from "@aws-sdk/client-dynamodb";
import { Command, HttpHandlerOptions } from "@aws-sdk/types";
import { SmithyResolvedConfiguration } from "@aws-sdk/smithy-client";
import { CognitoIdentityCredentialProvider } from "@aws-sdk/credential-provider-cognito-identity";
import { formatTime } from "@/model/utils"
import { REGION as region, MIN_ERROR_THRESHOLD } from "@/constants";

export interface Device {
  name: string;
  label: string;
  id: string;
  alerts: boolean;
  record: boolean;
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
    ClientInput extends clientDynamodb.ServiceInputTypes,
    ClientOutput extends clientDynamodb.ServiceOutputTypes
  >(
    command: Command<
      clientDynamodb.ServiceInputTypes,
      ClientInput,
      clientDynamodb.ServiceOutputTypes,
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
  const getItem = (params: clientDynamodb.GetItemCommandInput) => {
    return dbsend(new GetItemCommand(params));
  };
  const batchGetItem = (params: clientDynamodb.BatchGetItemCommandInput) => {
    return dbsend(new BatchGetItemCommand(params));
  };
  const query = (params: clientDynamodb.QueryCommandInput) => {
    return dbsend(new QueryCommand(params));
  };
  const putItem = (params: clientDynamodb.PutItemCommandInput) => {
    return dbsend(new PutItemCommand(params));
  };
  const deleteItem = (params: clientDynamodb.DeleteItemCommandInput) => {
    return dbsend(new DeleteItemCommand(params));
  };
  const updateItem = (params: clientDynamodb.UpdateItemCommandInput) => {
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

  const getDeviceInfo = async (
    device: string
    ): Promise<{recordUserActivity: boolean; labelName: string}> => {
      const params = {
        TableName: "DeviceInfo",
        Key: {"uid": {"S": device}},
        AttributesToGet: ["recordUserActivity", "labelName"]
      };

      const result = await getItem(params);

      const recordUserActivity = result?.Item?.recordUserActivity.BOOL ?? false;
      const labelName = result?.Item?.labelName?.S ?? device;

      return {recordUserActivity , labelName}
    }

  const putDevice = async (user = userId, device: Device) => {
      const userDeviceParams = {
        TableName: "UserDevices",
        Item: {
          'Username' : {S: user},
          'DeviceId' : {S: device.id}
        }
      }
      const deviceParams = {
        TableName: "DeviceInfo",
        Item: {
          'uid' : {S: device.id},
          'recordUserActivity' : {BOOL: false},
          'labelName' : {S: device.label}
        }
      }

      await putItem(userDeviceParams);
      await putItem(deviceParams);
    };

    const getDevices = async (user = userId): Promise<Record<string, Device>>  => {
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
      const items = result?.Items ?? [];
      const devices = await Promise.all(items
        .filter(({Disabled}) => Disabled?.BOOL !== true || admin)
        .map( async ({ DeviceId, UserDeviceName, AlertsEnabled, Disabled }) => {
          const {labelName, recordUserActivity} = await getDeviceInfo(DeviceId.S ?? "");
          return ({
          [DeviceId.S as string]: {
            id: DeviceId.S,
            label: labelName,
            name: ((UserDeviceName && UserDeviceName.S) ||
              labelName) as string,
            record: recordUserActivity,
            alerts: (AlertsEnabled && AlertsEnabled.S === "true") || false,
            disable: Disabled && Disabled.BOOL
          } as Device,
        })}))
      return Object.assign({}, ...devices)
    };

    const updateDeviceLabel = async ( device: string, newLabel: string) => {
      const params = {
        TableName: "DeviceInfo",
        Key: {
          ["uid"]: { S: device },
        },
        UpdateExpression: "set labelName = :l",
        ExpressionAttributeValues: {
          ":l": {
            S: newLabel.length > 0 ? newLabel : device,
          },
        },
        ReturnValues: "UPDATED_NEW",
      };
      const result = await updateItem(params);

      return result;
    };

    const updateDeviceName = async ( device: string, newName: string) => {
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
    };

    const updateDeviceRecord = async (device: string, record: boolean) => {
      const params = {
        TableName: "DeviceInfo",
        Key: {
          ["uid"]: { S: device },
        },
        UpdateExpression: "set recordUserActivity = :r",
        ExpressionAttributeValues: {
          ":r": {
            BOOL: record,
          },
        },
        ReturnValues: "UPDATED_NEW",
      };
      await updateItem(params);
    };

    const updateDeviceAlerts = async (device: string, alert: boolean) => {
      const params = {
        TableName: "UserDevices",
        Key: {
          "Username": { S: userId },
          "DeviceId": { S: device },
        },
        UpdateExpression: "set AlertsEnabled = :ae",
        ExpressionAttributeValues: {
          ":ae": {
            S: alert ? "true" : "false",
          },
        },
        ReturnValues: "UPDATED_NEW",
      };
      await updateItem(params);
    };

    const updateQRUsers = async (userIds: string[]) => {
      const params = {
        TableName: "Users",
        Key: {
          "Username": {S: userId}
      },
      UpdateExpression: "set #us = :us",
      ExpressionAttributeValues: {":us": { "SS": userIds.map(id => id)}},
      ExpressionAttributeNames: {"#us": "Users"}
    }
      return updateItem(params);
    }

    const getUserInfo = async (ids: string[]): Promise<User[]> => {
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
          const devices = await getDevices(Username.S);
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
    };

    const getQRUsers = async (): Promise<string[]> => {
      const params = {
        TableName: "Users",
        Key: {"Username": {"S": userId}},
        AttributesToGet: ["Users"]
      }
      const result = await getItem(params);
      const userIds = result?.Item?.Users?.SS;
      return userIds ?? [];
    }

    const getInvitedUsers = async (user = "USERS"): Promise<User[]> => {
      const params = {
        TableName: "Users",
        Key: {"Username": {"S": user}},
        AttributesToGet: ["Username", "Email", "Confirmed", "Users"]
      };
      const result = await getItem(params);
      const userIds = result?.Item?.Users?.SS
      if (userIds) {
        const info = await getUserInfo(userIds)
        const users = info.sort((a, b) => {
          const n1 = a.email.toLowerCase();
          const n2 = b.email.toLowerCase();
          return n1 < n2 ? -1 : n1 > n2 ? 1 : 0;
        })

        return users 
      }

      return [];
    };

    const deleteDevice = async (deviceId: string) => {
      const users = await getInvitedUsers();
      users.filter(user => user.devices[deviceId])
      .forEach(async (user) => { 
        const params = {
          TableName: "UserDevices",
          Key: {
            Username: {S: user.username},
            DeviceId: {S: deviceId}
          }
        }
        await deleteItem(params);
      });

      const deleteInfoParams = {
        TableName: "DeviceInfo",
        Key: {
          "uid": {S: deviceId}
        }
      };
      deleteItem(deleteInfoParams);
    };

    const toggleDeviceForUser = async (device: Device, user: User) => {
      const {id: deviceId} = device;
      const {username} = user;
      const userDevice = Object.values(user.devices).find(({id}) => id === deviceId);
      if (userDevice) {
        const disabled = await updateDeviceDisable(username, deviceId, !userDevice.disable)
        if (username === userId) {
          device.disable = disabled
        }
        userDevice.disable = disabled;
      } else {
        await putDevice(username, device);
      }
    };

    const getDeviceEvents = async (
      device: string,
      timeFrame: { startDate: string; endDate?: string }
    ): Promise<EventTableItem[]>  => {
      const {startDate, endDate} = timeFrame;
      const params = {
        TableName: "Events",
        KeyConditionExpression: "uid = :id AND sort BETWEEN :start and :end",
        ExpressionAttributeValues: {
          ":id": { S: device },
          ":start": { S: `Screen|${startDate}` },
          ":end": { S: `Screen|${endDate}` },
        },
      };
      const result = await query(params);

      const eventTableItems: EventTableItem[] | undefined = result?.Items?.map(item => {
        const temp = Number(item.disp.N ?? 0);
        const tsc = item.tsc.S ?? "";
        const device = item.uid.S ?? "";
        const qrid = item.qrid?.S ?? "";
        const threshold = Number(item.fth.N ?? 0);
         
        const displayedTemperature = Number(temp.toFixed(2));

        const result = temp > MIN_ERROR_THRESHOLD ? "Error" : temp > threshold ? "Fever" : "Normal";

        const date = tsc.replace(/_/g, ":");
        const lastHyphen = date.lastIndexOf(":");
        const timestamp = new Date(
          Date.parse(
            `${date.substr(0, lastHyphen)}.${date.substr(lastHyphen + 1)}`
          )
        );
        const time = formatTime(timestamp);

        const eventTableItem: EventTableItem = {
          device,
          displayedTemperature,
          threshold,
          result,
          timestamp,
          time,
          qrid
        }
        return eventTableItem
      });

      return eventTableItems ? eventTableItems : [];
    };

  return {
    getDeviceEvents,
    getDevices,
    getUserInfo,
    getInvitedUsers,
    getQRUsers,
    toggleDeviceForUser,
    deleteDevice,
    updateDeviceName,
    updateDeviceLabel,
    updateDeviceRecord,
    updateDeviceAlerts,
    updateQRUsers
  };
}
