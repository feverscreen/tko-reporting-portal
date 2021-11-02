import auth from "./auth";
const API =
  "https://3pu8ojk2ej.execute-api.ap-southeast-2.amazonaws.com/default";
const hashAPI = (userId: string) => `${API}/users/hash/${userId}`;
const decryptAPI = (userHash: string) => `${hashAPI(userHash)}/decrypt`;
const qrEventsAPI = (userHash: string) => `${hashAPI(userHash)}/events`;

export const formatTime = (d: Date): string => {
  return `${d.toLocaleTimeString()} - ${d.toDateString()}`;
};

export const formatDate = (date: Date): string =>
  date.toISOString().replace(/:/g, "_").replace(/\./g, "_");
export const formatTsc = (dateStr: string): Date => {
  const date = dateStr.replace(/_/g, ":");
  const lastHyphen = date.lastIndexOf(":");
  const timestamp = new Date(
    Date.parse(`${date.substr(0, lastHyphen)}.${date.substr(lastHyphen + 1)}`)
  );
  return timestamp;
};

export const createHash = async (message: string): Promise<string> => {
  try {
    const hash = await fetch(hashAPI(message), {
      method: "GET",
      headers: {
        Authorization: auth.auth.getCachedSession().getIdToken().getJwtToken(),
      },
    });
    return (await hash.text()).replaceAll('"', "");
  } catch (error) {
    console.error(error);
  }
  return "";
};

export const decryptHash = async (message: string): Promise<string> => {
  try {
    const hash = await fetch(decryptAPI(message), {
      method: "GET",
    });
    if (hash.ok) {
      return (await hash.text()).replaceAll('"', "");
    } else {
      throw Error(await hash.text());
    }
  } catch (error) {
    console.error(error);

    return "Invalid";
  }
};

export const getUserEvents = async (
  hash: string
): Promise<{ qrid: string; date: Date; reading: number }[]> => {
  try {
    const events = await fetch(qrEventsAPI(hash), {
      method: "GET",
    });
    if (events.ok) {
      const info = (await events.json()).Items as
        | { disp?: { N: number }; tsc?: { S: string }; qrid: { S: string } }[]
        | undefined;
      if (info) {
        return info.map((val) => {
          const reading = val.disp?.N ?? 0;
          const date = val.tsc?.S ?? "";
          const qrid = val.qrid.S;
          return { qrid, date: formatTsc(date), reading };
        });
      } else {
        throw Error(await events.text());
      }
    }
    return [];
  } catch (error) {
    console.error(error);
    return [];
  }
};
