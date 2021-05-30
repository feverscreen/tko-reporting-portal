import { API_BASE } from "./constants";
import { CognitoAuth } from "amazon-cognito-auth-js";

export interface Device {
  name: string;
  id: string;
  alerts: boolean;
}

export function RequestHandler(auth: CognitoAuth) {
  return {
    lastApiRequestTime: 0,
    async makeRequest(
      url: string,
      method: string,
      payload: undefined | Record<string, Device> = undefined
    ): Promise<Response> {
      const { exp } = auth.getCachedSession().getIdToken().decodePayload() as {
        exp: number;
      };
      const now = new Date().getTime() / 1000;
      const hasExpired = now > exp;
      if (hasExpired) {
        window.location.reload();
        // Should never happen.
        return fetch(`${API_BASE}${url}`);
      } else {
        const options: any = {
          method,
          headers: {
            Authorization: auth.getCachedSession().getIdToken().getJwtToken(),
          },
        };
        if (method === "POST" && payload !== undefined) {
          options.body = JSON.stringify(payload);
        }
        this.lastApiRequestTime = new Date().getTime();
        return fetch(`${API_BASE}${url}`, options);
      }
    },
    async makeGetRequest(url: string): Promise<Response> {
      return this.makeRequest(url, "GET");
    },
    async makePostRequest(
      url: string,
      payload: undefined | Record<string, Device>
    ): Promise<Response> {
      return this.makeRequest(url, "POST", payload);
    },
  };
}

export const formatTime = (d: Date): string => {
  return `${d.toLocaleTimeString()} - ${d.toDateString()}`;
};

export const formatDate = (date: Date): string =>
  date.toISOString().replace(/:/g, "_").replace(/\./g, "_");
