import clientDynamodb, {
  DynamoDBClient,
  GetItemCommand,
  BatchGetItemCommand,
  QueryCommand,
  PutItemCommand,
  DeleteItemCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import { Command, HttpHandlerOptions } from "@aws-sdk/types";
import { SmithyResolvedConfiguration } from "@aws-sdk/smithy-client";
import { CognitoIdentityCredentialProvider } from "@aws-sdk/credential-provider-cognito-identity";
import { formatTime, formatTsc } from "@/model/utils";
import { REGION as region, MIN_ERROR_THRESHOLD } from "@/constants";

export interface Device {
  name: string;
  label: string;
  id: string;
  version?: string;
  alerts: boolean;
  record: boolean;
  qr: boolean;
  disable: boolean;
}

export interface Admin {
  username: string;
  email: string;
  confirmed: boolean;
  devices: Record<string, Device>;
  group?: string;
  organization?: string;
  users?: string;
}

export interface User {
  qrid: string;
  organization: string;
}

export interface DBUserInfo {
  Username: { S: string };
  Confirmed?: { BOOL: boolean };
  Email?: { S: string };
  Group?: { S: string };
  Organization?: { S: string };
  Users?: { SS: string[] };
}

export interface EventTableItem {
  displayedTemperature: number;
  threshold: number;
  result: "Fever" | "Normal" | "Error";
  device: string;
  timestamp: Date;
  time: string;
  tsc: string;
  qrid: string;
  //[key: string]: string | number | Date;
}

export interface DynamoEventItem {
  disp: number;
  fth: number;
  tsc: string;
  uid: string;
}

type event = {
  disp?: { N: number };
  tsc?: { S: string };
  uid?: { S: string };
  qrid?: { S: string };
  fth?: { N: number };
};

export default function DatabaseHandler(
  userId: string,
  auth: CognitoIdentityCredentialProvider
) {
  const ddbClient = new DynamoDBClient({ region, credentials: auth });
  const parseEventItem = (item: event) => {
    const temp = Number(item.disp?.N ?? 0);
    const tsc = item.tsc?.S ?? "";
    const device = item.uid?.S ?? "";
    const qrid = item.qrid?.S ?? "";
    const threshold = Number(item.fth?.N ?? 0);

    const displayedTemperature = Number(temp.toFixed(2));

    const result =
      temp > MIN_ERROR_THRESHOLD
        ? "Error"
        : temp > threshold
        ? "Fever"
        : "Normal";

    const timestamp = formatTsc(tsc);
    const time = formatTime(timestamp);

    const eventTableItem: EventTableItem = {
      device,
      displayedTemperature,
      threshold,
      result,
      timestamp,
      time,
      tsc,
      qrid,
    };
    return eventTableItem;
  };

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
      console.error(e, command);
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

  const updateDeviceDisable = async (
    user: string,
    device: string,
    disable: boolean
  ): Promise<boolean> => {
    const params = {
      TableName: "UserDevices",
      Key: {
        ["Username"]: { S: user },
        ["DeviceId"]: { S: device },
      },
      UpdateExpression: "set Disabled = :dis",
      ExpressionAttributeValues: {
        ":dis": {
          BOOL: disable,
        },
      },
      ReturnValues: "UPDATED_NEW",
    };
    const result = await updateItem(params);
    const toggle = result?.Attributes?.Disabled.BOOL;

    return toggle ? toggle : false;
  };

  const getDeviceInfo = async (
    device: string
  ): Promise<{
    recordUserActivity: boolean;
    qrMode: boolean;
    labelName: string;
    version: string;
  }> => {
    const params = {
      TableName: "DeviceInfo",
      Key: { uid: { S: device } },
      AttributesToGet: ["recordUserActivity", "labelName", "qrMode", "version"],
    };

    const result = await getItem(params);

    const recordUserActivity = result?.Item?.recordUserActivity?.BOOL ?? false;
    const qrMode = result?.Item?.qrMode?.BOOL ?? true;
    const version = result?.Item?.version?.S ?? "";
    const labelName = result?.Item?.labelName?.S ?? device;

    return { recordUserActivity, qrMode, labelName, version };
  };

  const putDevice = async (user = userId, device: Device) => {
    const userDeviceParams = {
      TableName: "UserDevices",
      Item: {
        Username: { S: user },
        DeviceId: { S: device.id },
      },
    };
    const deviceParams = {
      TableName: "DeviceInfo",
      Item: {
        uid: { S: device.id },
        recordUserActivity: { BOOL: false },
        labelName: { S: device.label },
      },
    };

    await putItem(userDeviceParams);
    await putItem(deviceParams);
  };

  const getDevices = async (user = userId): Promise<Record<string, Device>> => {
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
    const devices = await Promise.all(
      items
        //.filter(({ Disabled }) => Disabled?.BOOL !== true || admin)
        .map(async ({ DeviceId, UserDeviceName, AlertsEnabled, Disabled }) => {
          const { labelName, qrMode, recordUserActivity, version } =
            await getDeviceInfo(DeviceId.S ?? "");
          return {
            [DeviceId.S as string]: {
              id: DeviceId.S,
              label: labelName,
              name: ((UserDeviceName && UserDeviceName.S) ||
                labelName) as string,
              record: recordUserActivity,
              qr: qrMode,
              version,
              alerts: (AlertsEnabled && AlertsEnabled.S === "true") || false,
              disable: Disabled && Disabled.BOOL,
            } as Device,
          };
        })
    );
    return Object.assign({}, ...devices);
  };

  const updateDeviceLabel = async (device: string, newLabel: string) => {
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

    return await updateItem(params);
  };

  const updateDeviceName = async (device: string, newName: string) => {
    const params = {
      TableName: "UserDevices",
      Key: {
        ["Username"]: { S: userId },
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

  const updateDeviceQR = async (device: string, qrMode: boolean) => {
    const params = {
      TableName: "DeviceInfo",
      Key: {
        uid: { S: device },
      },
      UpdateExpression: "set qrMode = :qr",
      ExpressionAttributeValues: {
        ":qr": {
          BOOL: qrMode,
        },
      },
      ReturnValues: "UPDATED_NEW",
    };
    return await updateItem(params);
  };

  const updateDeviceAlerts = async (device: string, alert: boolean) => {
    const params = {
      TableName: "UserDevices",
      Key: {
        Username: { S: userId },
        DeviceId: { S: device },
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

  const updateAdminOrg = async (adminId: string, organization: string) => {
    const params = {
      TableName: "Users",
      Key: {
        Username: { S: adminId },
      },
      UpdateExpression: "set #org = :org",
      ExpressionAttributeValues: { ":org": { S: organization } },
      ExpressionAttributeNames: { "#org": "Organization" },
    };
    return updateItem(params);
  };

  const getUserInfo = async (ids: string[]): Promise<Admin[]> => {
    const params = {
      RequestItems: {
        Users: {
          Keys: ids.map((id) => ({ Username: { S: id } })),
          AttributesToGet: [
            "Username",
            "Email",
            "Group",
            "Confirmed",
            "Organization",
          ],
        },
      },
    };
    const result = await batchGetItem(params);
    const info = result?.Responses?.Users as DBUserInfo[] | undefined;
    if (info) {
      return Promise.all(
        info.map(
          async ({ Username, Confirmed, Email, Group, Users, ...rest }) => {
            const devices = await getDevices(Username.S);
            const organization = rest.Organization?.S ?? "";
            return {
              username: Username.S,
              confirmed: Confirmed?.BOOL,
              email: Email?.S,
              group: Group?.S,
              users: Users?.SS,
              organization,
              devices,
            } as Admin;
          }
        )
      );
    }

    return [];
  };

  const getQRUsers = async (organization: string): Promise<User[]> => {
    const params = {
      TableName: "TeKahuOra",
      KeyConditionExpression: "PK = :org and begins_with(SK, :usr)",
      ExpressionAttributeValues: {
        ":org": { S: organization },
        ":usr": { S: "USER" },
      },
    };
    const result = await query(params);
    const userIds = result?.Items as
      | { id: { S: string }; adminId: { S: string } }[]
      | undefined;
    if (userIds) {
      return Promise.all(
        userIds.map((val) => ({ organization, qrid: val.id.S }))
      );
    }
    return [];
  };

  const deleteQRUser = async (user: User): Promise<void> => {
    const params = {
      TableName: "TeKahuOra",
      Key: {
        PK: { S: user.organization },
        SK: { S: `USER|${user.qrid}` },
      },
    };
    await deleteItem(params);
  };

  const getAdminUsers = async (user = "USERS"): Promise<Admin[]> => {
    const params = {
      TableName: "Users",
      Key: { Username: { S: user } },
      AttributesToGet: [
        "Username",
        "Email",
        "Confirmed",
        "Users",
        "Organization",
      ],
    };
    const result = await getItem(params);
    const userIds = result?.Item?.Users?.SS;
    if (userIds) {
      const info = await getUserInfo(userIds);
      const users = info.sort((a, b) => {
        const n1 = a.email.toLowerCase();
        const n2 = b.email.toLowerCase();
        return n1 < n2 ? -1 : n1 > n2 ? 1 : 0;
      });

      return users;
    }

    return [];
  };

  let currAdmin: Admin | undefined;

  const getCurrAdmin = async (): Promise<Admin | undefined> => {
    if (currAdmin) {
      return currAdmin;
    }
    const params = {
      TableName: "Users",
      Key: { Username: { S: userId } },
      AttributesToGet: [
        "Username",
        "Email",
        "Group",
        "Confirmed",
        "Organization",
      ],
    };
    const result = await getItem(params);
    const info = result?.Item as DBUserInfo | undefined;
    if (info) {
      const { Username, Confirmed, Email, Group } = info;
      const devices = await getDevices(Username.S);
      const organization = info.Organization?.S ?? "";
      const admin = {
        username: Username.S,
        confirmed: Confirmed?.BOOL ?? false,
        email: Email?.S,
        group: Group?.S,
        organization,
        devices,
      } as Admin;
      currAdmin = admin;
      return currAdmin;
    }
    return undefined;
  };

  const updateQRUser = async (user: User) => {
    const params = {
      TableName: "TeKahuOra",
      Key: {
        PK: { S: user.organization },
        SK: { S: `USER|${user.qrid}` },
      },
      UpdateExpression: "set #id = :id, #aid = :aid",
      ExpressionAttributeValues: {
        ":id": { S: user.qrid },
        ":aid": { S: userId },
      },
      ExpressionAttributeNames: { "#id": "id", "#aid": "adminId" },
    };
    parseFloat;
    return updateItem(params);
  };

  const deleteDevice = async (deviceId: string) => {
    const users = await getAdminUsers();
    users
      .filter((user) => user.devices[deviceId])
      .forEach(async (user) => {
        const params = {
          TableName: "UserDevices",
          Key: {
            Username: { S: user.username },
            DeviceId: { S: deviceId },
          },
        };
        await deleteItem(params);
      });

    const deleteInfoParams = {
      TableName: "DeviceInfo",
      Key: {
        uid: { S: deviceId },
      },
    };
    deleteItem(deleteInfoParams);
  };

  const toggleDeviceForAdmin = async (device: Device, user: Admin) => {
    const { id: deviceId } = device;
    const { username } = user;
    const userDevice = Object.values(user.devices).find(
      ({ id }) => id === deviceId
    );
    if (userDevice) {
      const disabled = await updateDeviceDisable(
        username,
        deviceId,
        !userDevice.disable
      );
      if (username === userId) {
        device.disable = disabled;
      }
      userDevice.disable = disabled;
    } else {
      await putDevice(username, device);
    }
  };

  const getQRUserEvents = async (
    qrid: string
  ): Promise<{ qrid: string; date: Date; reading: number }[]> => {
    console.log(qrid);
    const params = {
      TableName: "Events",
      IndexName: "qrid-readings",
      KeyConditionExpression: "qrid = :id",
      ExpressionAttributeValues: {
        ":id": { S: qrid },
      },
    };
    const result = await query(params);
    const info = result?.Items as
      | { disp?: { N: number }; tsc?: { S: string } }[]
      | undefined;
    if (info) {
      return info.map((val) => {
        const reading = val.disp?.N ?? 0;
        const date = val.tsc?.S ?? "";
        return { qrid, date: formatTsc(date), reading };
      });
    } else {
      return [];
    }
  };
  const getDeviceEvents = async (
    device: string,
    timeFrame: { startDate: string; endDate?: string }
  ): Promise<EventTableItem[]> => {
    const { startDate, endDate } = timeFrame;
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

    const eventTableItems: EventTableItem[] | undefined = result?.Items?.map(
      (item: event) => {
        return parseEventItem(item);
      }
    );

    return eventTableItems ? eventTableItems : [];
  };

  return {
    // Dyanmo DB
    getDeviceEvents,
    getDevices,
    getUserInfo,
    getAdminUsers,
    getCurrAdmin,
    getQRUsers,
    getQRUserEvents,
    toggleDeviceForAdmin,
    deleteDevice,
    deleteQRUser,
    updateDeviceName,
    updateDeviceLabel,
    updateDeviceRecord,
    updateDeviceQR,
    updateDeviceAlerts,
    updateQRUser,
    updateAdminOrg,
  };
}
