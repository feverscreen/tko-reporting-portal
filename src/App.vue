<template>
  <v-app v-if="loggedInStatus.loggedIn">
    <v-app-bar color="white" app>
      <div class="logo"></div>
      <v-spacer />
      {{ userEmail }}
      <span>&nbsp;</span>
      <v-btn @click="signOut" text color="#086797">Sign out</v-btn>
    </v-app-bar>
    <v-container>
      <v-row align="center">
        <v-toolbar flat>
          <v-spacer />
          <v-btn text @click="showAlertsDialog = true"> Device alerts </v-btn>
          <v-btn text @click="showDeviceNamesDialog = true">
            Device names
          </v-btn>
          <v-btn @click="exportCsv" text>Export CSV</v-btn>
        </v-toolbar>
      </v-row>
      <v-row align="center">
        <v-col>
          <v-select
            class="selectors"
            label="devices"
            :items="deviceIds"
            v-model="selectedDevices"
            item-text="name"
            item-value="id"
            @change="selectedDevicesChanged"
            multiple
            chips
            filled
            light
          >
            <template v-slot:prepend-item>
              <v-list-item ripple @click="selectAllDevices">
                <v-list-item-action>
                  <v-icon
                    :color="selectedDevices.length > 0 ? 'indigo darken-4' : ''"
                  >
                    {{ icon }}
                  </v-icon>
                </v-list-item-action>
                <v-list-item-content>
                  <v-list-item-title> Select All </v-list-item-title>
                </v-list-item-content>
              </v-list-item>
              <v-divider class="mt-2"></v-divider>
            </template>
          </v-select>
        </v-col>
        <v-col>
          <v-select
            height="68"
            label="timespan"
            :items="timespans"
            filled
            light
            v-model="selectedTimespan"
            @change="selectedTimespanChanged"
          />
        </v-col>
      </v-row>

      <v-dialog
        ref="dialog"
        v-model="showDeviceNamesDialog"
        persistent
        max-width="500"
      >
        <v-card :loading="updatingDeviceNames">
          <v-card-title>Device naming</v-card-title>
          <v-card-subtitle align="left"
            >Give your screening devices friendly names i.e "Staff Kitchen",
            "Reception".</v-card-subtitle
          >
          <v-card-text>
            <v-text-field
              v-for="device in devices"
              :key="device.id"
              :label="device.id"
              v-model="device.name"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn text color="primary" @click="showDeviceNamesDialog = false">
              Cancel
            </v-btn>
            <v-btn text color="primary" @click="updateDeviceNames">
              Save
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-dialog
        ref="dialog"
        v-model="showAlertsDialog"
        persistent
        max-width="320"
      >
        <v-card :loading="updatingAlertSettings">
          <v-card-title>Device alerts</v-card-title>
          <v-card-subtitle align="left"
            >Enable email alerts per device.</v-card-subtitle
          >
          <v-card-text>
            <v-row v-for="device in devices" :key="device.id">
              <v-col>
                <v-switch :label="`${device.name}`" v-model="device.alerts" />
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn text color="primary" @click="showAlertsDialog = false">
              Cancel
            </v-btn>
            <v-btn text color="primary" @click="updateAlertSettings">
              Save
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-row v-if="isCustomTimespan" align="center">
        <v-dialog
          ref="dialog"
          v-model="showDateRangePicker"
          :return-value.sync="timespans[timespans.length - 1].value"
          @input="selectedTimespanChanged"
          persistent
          width="290px"
        >
          <template v-slot:activator="{ on, attrs }">
            <v-text-field
              :value="timespans[timespans.length - 1].value.join(' - ')"
              label="Custom date range"
              prepend-icon="mdi-calendar"
              readonly
              v-bind="attrs"
              v-on="on"
            />
          </template>
          <v-date-picker v-model="timespans[timespans.length - 1].value" range>
            <v-spacer />
            <v-btn text color="primary" @click="showDateRangePicker = false">
              Cancel
            </v-btn>
            <v-btn
              text
              color="primary"
              @click="$refs.dialog.save(timespans[timespans.length - 1].value)"
            >
              OK
            </v-btn>
          </v-date-picker>
        </v-dialog>
      </v-row>
      <v-row v-if="selectedTimespan && selectedDevices.length">
        <div v-if="dataIsLoading && !eventItems.length" class="summary-bubbles">
          Loading...
        </div>
        <div v-else-if="eventItems.length !== 0" class="summary-bubbles">
          <h4>{{ eventItems.length }} screenings</h4>
          <div class="event-summary normal" v-if="numNormalEvents !== 0">
            <span>
              {{ numNormalEvents }}
            </span>
            <span>normal</span>
          </div>
          <div class="event-summary fever" v-if="numFeverEvents !== 0">
            <span>{{ numFeverEvents }}</span>
            <span>fever</span>
          </div>
          <div class="event-summary errored" v-if="numErrorEvents !== 0">
            <span> {{ numErrorEvents }} </span><span>errors</span>
          </div>
        </div>
      </v-row>
      <v-row align="center" v-if="selectedTimespan && selectedDevices.length">
        <v-col>
          <apexchart
            :temperatures="temperatures"
            :getColorForItem="getColorForItem"
          />
          <v-data-table
            fixed-header
            :loading="dataIsLoading"
            :headers="headers"
            :items="events"
            :items-per-page="eventItems.length"
            sort-by="time"
            sort-desc
            :custom-sort="sortItems"
            hide-default-footer
            :no-data-text="'No events found for selected timespan'"
          >
            <template v-slot:[`item.displayedTemperature`]="{ item }">
              <v-chip :color="getColorForItem(item)" dark>
                {{ item.displayedTemperature }}
              </v-chip>
            </template>
          </v-data-table>
        </v-col>
      </v-row>
    </v-container>
  </v-app>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import VueApexCharts from "vue-apexcharts";
import ScreeningChart from "@/components/ScreeningChart.component.vue";
import { CognitoAuth, CognitoAuthSession } from "amazon-cognito-auth-js";
import { DataTableHeader } from "vuetify";
import { formatTime } from "@/utils";
import downloadCsv from "download-csv";

Vue.use(VueApexCharts);

const hostName = `${window.location.protocol}//${window.location.host}`;
const auth = new CognitoAuth({
  ClientId: "7ijdj7d02sn1jmta9blul42373",
  AppWebDomain: "tekahuora.auth.ap-southeast-2.amazoncognito.com",
  TokenScopesArray: ["email", "openid", "aws.cognito.signin.user.admin"],
  RedirectUriSignIn: hostName,
  RedirectUriSignOut: hostName,
});

const MIN_ERROR_THRESHOLD = 42.5;
const API_BASE =
  "https://3pu8ojk2ej.execute-api.ap-southeast-2.amazonaws.com/default";
// If the API response returns 401, logout so that they'll be redirected to the cognito sign-in page.
// Set the auth token for axios to use when the component is created.

let lastApiRequestTime = 0;

const makeRequest = async (
  url: string,
  method: string,
  payload: any = undefined
): Promise<Response> => {
  const { exp } = auth.getCachedSession().getIdToken().decodePayload() as any;
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
    lastApiRequestTime = new Date().getTime();
    return fetch(`${API_BASE}${url}`, options);
  }
};

const makeGetRequest = async (url: string): Promise<Response> => {
  return makeRequest(url, "GET");
};

const makePostRequest = async (
  url: string,
  payload: any
): Promise<Response> => {
  return makeRequest(url, "POST", payload);
};

const formatDate = (date: Date): string =>
  date.toISOString().replace(/:/g, "_").replace(/\./g, "_");

interface Device {
  name: string;
  id: string;
  alerts: boolean;
}

interface EventTableItem {
  displayedTemperature: number;
  threshold: number;
  result: "Fever" | "Normal" | "Error";
  timestamp: Date;
  device: string;
  time: string;
  [key: string]: string | number | Date;
}

interface DynamoEventItem {
  disp: number;
  fth: number;
  tsc: string;
  uid: string;
}

interface SavedSettings {
  devices: string[];
  timespan: { start: number } | [string, string];
}

@Component({
  components: { apexchart: ScreeningChart },
})
export default class App extends Vue {
  private loggedInStatus: {
    loggedIn: boolean;
    currentUser: string | null;
  } = { loggedIn: false, currentUser: null };
  private devices: Record<string, Device> = {};
  private selectedDevices: string[] = [];
  private eventItems: EventTableItem[] = [];
  private dataIsLoading = false;
  private showDateRangePicker = false;
  private showDeviceNamesDialog = false;
  private updatingDeviceNames = false;
  private showAlertsDialog = false;
  private updatingAlertSettings = false;
  private timespans = [
    {
      text: "Last hour",
      value: { start: -1 }, // Relative hours to now.
    },
    {
      text: "Last 24 hours",
      value: { start: -24 },
    },
    {
      text: "Last week",
      value: { start: -(24 * 7) },
    },
    {
      text: "Custom",
      value: ["2020-10-01", "2020-10-04"], // Concrete date ranges
    },
  ];
  private selectedTimespan: { start: number } | string[] = this.timespans[1]
    .value;

  sortItems(
    items: EventTableItem[],
    index: (string | undefined)[],
    isDesc: (boolean | undefined)[]
  ) {
    if (index[0] !== undefined && isDesc[0] !== undefined) {
      const i = index[0] === "time" ? "timestamp" : index[0];
      if (isDesc[0]) {
        items.sort((a: EventTableItem, b: EventTableItem) =>
          a[i] < b[i] ? 1 : -1
        );
      } else {
        items.sort((a: EventTableItem, b: EventTableItem) =>
          a[i] > b[i] ? 1 : -1
        );
      }
    }
    return items;
  }

  exportCsv() {
    let start = this.dateRangeForSelectedTimespan.startDate as string;
    start = start.substr(0, start.lastIndexOf("_"));
    let end =
      this.dateRangeForSelectedTimespan.endDate || formatDate(new Date());
    end = end.substr(0, end.lastIndexOf("_"));
    const range = `${start} - ${end}`.replace(/T/g, " ").replace(/_/g, "-");
    downloadCsv(
      this.events,
      {
        device: "Device",
        timestamp: "Date/Time",
        displayedTemperature: "Screened Temp C",
        threshold: "Fever Threshold C",
        time: "Time",
        result: "Screening Result",
      },
      `${this.selectedDevices
        .map((device) => this.devices[device].name.replace(/,/g, ""))
        .join("|")} -- ${range}.csv`
    );
  }

  async updateDeviceNames() {
    this.updatingDeviceNames = true;
    this.devices = Object.values(this.devices)
      .map((item) => ({
        ...item,
        name: item.name === "" ? item.id : item.name,
      }))
      .reduce((acc: Record<string, Device>, item: Device) => {
        acc[item.id] = item;
        return acc;
      }, {} as Record<string, Device>);
    await makePostRequest("/devices/update", this.devices);
    this.updatingDeviceNames = false;
    this.showDeviceNamesDialog = false;
  }

  async updateAlertSettings() {
    this.updatingAlertSettings = true;
    this.devices = Object.values(this.devices)
      .map((item) => ({
        ...item,
        name: item.name === "" ? item.id : item.name,
      }))
      .reduce((acc: Record<string, Device>, item: Device) => {
        acc[item.id] = item;
        return acc;
      }, {} as Record<string, Device>);
    await makePostRequest("/devices/update", this.devices);
    this.updatingAlertSettings = false;
    this.showAlertsDialog = false;
  }

  get selectedAllDevices() {
    return this.selectedDevices.length === this.deviceIds.length;
  }

  get icon() {
    if (this.selectedAllDevices) return "mdi-close-box";
    if (this.selectedDevices.length > 0 && !this.selectedAllDevices)
      return "mdi-minus-box";
    return "mdi-checkbox-blank-outline";
  }

  get deviceIds(): { name: string; id: string }[] {
    return Object.values(this.devices);
  }

  get dateRangeForSelectedTimespan(): {
    startDate: string | null;
    endDate: string | null;
  } {
    let startDate: string | null = null;
    let endDate: string | null = null;
    if (!Array.isArray(this.selectedTimespan) && this.selectedTimespan.start) {
      const range = this.selectedTimespan;
      // we have a relative range.
      startDate = formatDate(
        new Date(new Date().getTime() + 1000 * 60 * 60 * range.start)
      );
    } else if (Array.isArray(this.selectedTimespan)) {
      const customRange = this.timespans[this.timespans.length - 1]
        .value as string[];
      startDate = customRange[0];
      endDate = customRange[1];
      if (endDate < startDate) {
        // Make sure end is always greater or equal than start.
        const temp = startDate;
        startDate = endDate;
        endDate = temp;
      }

      // Add timezone offsets for NZ
      const offset = new Date().getTimezoneOffset() * 60 * 1000;
      startDate = formatDate(new Date(Date.parse(startDate) + offset));
      endDate = formatDate(
        new Date(Date.parse(endDate) + 1000 * 60 * 60 * 24 + offset)
      );
    }

    return { startDate, endDate };
  }

  get events(): EventTableItem[] {
    return this.eventItems.map((eventItem: EventTableItem) => ({
      ...eventItem,
      device: this.devices[eventItem.device].name,
    }));
  }

  get isCustomTimespan(): boolean {
    return Array.isArray(this.selectedTimespan);
  }

  get resultsSummaryText(): string {
    return `${this.eventItems.length} total screenings, ${
      this.eventItems.filter((item) => item.result === "Fever").length
    } screened as Fever`;
  }

  get numNormalEvents(): number {
    return this.eventItems.filter((item) => item.result === "Normal").length;
  }

  get numErrorEvents(): number {
    return this.eventItems.filter((item) => item.result === "Error").length;
  }

  get numFeverEvents(): number {
    return this.eventItems.filter((item) => item.result === "Fever").length;
  }

  // noinspection JSMismatchedCollectionQueryUpdate
  private headers: DataTableHeader[] = [
    {
      text: "Device",
      value: "device",
    },
    {
      text: "Screened Temp C",
      value: "displayedTemperature",
    },
    {
      text: "Fever Threshold C",
      value: "threshold",
    },
    {
      text: "Time",
      value: "time",
    },
  ];

  getColorForItem(item: EventTableItem): string {
    if (item.displayedTemperature > MIN_ERROR_THRESHOLD) {
      return "#B8860B";
    }
    if (item.displayedTemperature > item.threshold) {
      return "#a81c11";
    }
    return "#11a84c";
  }

  get temperatures() {
    return [
      {
        name: "temperatures",
        data: this.eventItems.map(
          ({ displayedTemperature }) => displayedTemperature
        ),
      },
    ];
  }

  get userEmail(): string {
    return (auth.getCachedSession().getIdToken().decodePayload() as {
      email: string;
    }).email;
  }

  created() {
    auth.userhandler = {
      onSuccess: (_session: CognitoAuthSession) => {
        this.loggedInStatus.currentUser = auth.getCurrentUser();
        this.loggedInStatus.loggedIn = true;
        if (window.location.href.includes("?code=")) {
          window.location.href = hostName;
        } else {
          this.init();
        }
      },
      onFailure: () => {
        auth.signOut();
      },
    };
    auth.useCodeGrantFlow();
    // Or try and find an auth token in localStorage?
    if (window.location.href.includes("?code=")) {
      auth.parseCognitoWebResponse(window.location.href);
    } else if (!auth.isUserSignedIn()) {
      setTimeout(() => {
        if (!auth.isUserSignedIn()) {
          // This triggers a redirect to the login page.
          auth.getSession();
        }
      }, 1000);
    } else {
      auth.getSession();
    }
  }

  async init() {
    // Should be signed in already:
    this.loggedInStatus.currentUser = auth.getCurrentUser();
    this.loggedInStatus.loggedIn = true;

    // Load config from localStorage:
    const configRaw = window.localStorage.getItem("config");
    if (configRaw !== null) {
      try {
        const config = JSON.parse(configRaw) as SavedSettings;
        this.selectedDevices = config.devices;
        if (Array.isArray(config.timespan)) {
          // Custom timespan:
          this.timespans[this.timespans.length - 1].value = config.timespan;
          this.selectedTimespan = this.timespans[
            this.timespans.length - 1
          ].value;
        } else {
          const timespan = this.timespans.find(
            (timespan) =>
              !Array.isArray(timespan.value) &&
              (timespan as { text: string; value: { start: number } }).value
                .start === (config.timespan as { start: number }).start
          );
          if (timespan) {
            this.selectedTimespan = timespan.value;
          }
        }
      } catch (e) {
        // Do nothing
      }
      await this.fetchDevicesForUser();
      this.selectedDevices = this.selectedDevices.filter((device) =>
        Object.keys(this.devices).includes(device)
      );
      if (this.selectedDevices.length) {
        await this.fetchEventsForDevices(
          this.selectedDevices,
          this.dateRangeForSelectedTimespan
        );
      }
    } else {
      await this.fetchDevicesForUser();
    }

    // Periodically refresh.
    setInterval(async () => {
      const now = new Date().getTime();
      if (now - lastApiRequestTime > 1000 * 50) {
        if (this.selectedDevices.length) {
          await this.fetchEventsForDevices(
            this.selectedDevices,
            this.dateRangeForSelectedTimespan
          );
        } else {
          await this.fetchDevicesForUser();
        }
      }
    }, 1000 * 60);
  }

  async fetchEventsForDevices(
    devices: string[],
    range: { startDate: string | null; endDate: string | null }
  ) {
    const allEvents: Promise<DynamoEventItem[]>[] = [];
    this.dataIsLoading = true;
    for (const device of devices) {
      allEvents.push(
        new Promise((resolve, reject) => {
          let url = `/events?deviceId=${device}&type=Screen`;
          if (range.startDate) {
            url += `&startDate=${range.startDate}`;
          }
          if (range.endDate) {
            url += `&endDate=${range.endDate}`;
          }
          makeGetRequest(url).then((response) => {
            response.json().then((result) => resolve(result.Items));
          });
        })
      );
    }
    const allEventData = await Promise.all(allEvents);
    const mappedEventData = [];
    for (const deviceEvents of allEventData) {
      if (deviceEvents.length !== 0) {
        mappedEventData.push(
          ...deviceEvents.map(
            (item: DynamoEventItem): EventTableItem => {
              const displayedTemp = item.disp;
              const threshold = item.fth;
              const date = item.tsc.replace(/_/g, ":");
              const lastHyphen = date.lastIndexOf(":");
              const d = new Date(
                Date.parse(
                  `${date.substr(0, lastHyphen)}.${date.substr(lastHyphen + 1)}`
                )
              );
              return Object.freeze({
                device: item.uid,
                timestamp: d,
                displayedTemperature: Number(displayedTemp.toFixed(2)),
                threshold: threshold,
                result:
                  displayedTemp > MIN_ERROR_THRESHOLD
                    ? "Error"
                    : displayedTemp > threshold
                    ? "Fever"
                    : "Normal",
                time: formatTime(d),
              });
            }
          )
        );
      }
    }
    this.eventItems = mappedEventData
      .filter((item: EventTableItem) => item.displayedTemperature > 0)
      .sort((a: EventTableItem, b: EventTableItem) =>
        a.timestamp < b.timestamp ? 1 : -1
      );

    this.dataIsLoading = false;
  }

  selectAllDevices() {
    if (this.deviceIds.length === this.selectedDevices.length) {
      this.selectedDevices = [];
      this.selectedDevicesChanged([]);
    } else {
      const deviceIds = this.deviceIds.map((val) => val.id);
      this.selectedDevices = deviceIds;
      this.selectedDevicesChanged(deviceIds);
    }
  }
  async fetchDevicesForUser() {
    const devices = await makeGetRequest("/devices");
    this.devices = await devices.json();
    if (Object.values(this.devices).length === 1) {
      this.selectedDevices = [Object.keys(this.devices)[0]];
      await this.fetchEventsForDevices(
        this.selectedDevices,
        this.dateRangeForSelectedTimespan
      );
    }
  }

  selectedDevicesChanged(deviceIds: string[]) {
    window.localStorage.setItem(
      "config",
      JSON.stringify({
        devices: deviceIds,
        timespan: this.selectedTimespan,
      })
    );
    this.fetchEventsForDevices(deviceIds, this.dateRangeForSelectedTimespan);
  }

  selectedTimespanChanged(
    timespan:
      | {
          start: Date | number;
          end: Date | number | undefined;
        }
      | string[]
  ) {
    window.localStorage.setItem(
      "config",
      JSON.stringify({
        devices: this.selectedDevices,
        timespan: this.isCustomTimespan
          ? this.timespans[this.timespans.length - 1].value
          : timespan,
      })
    );

    if (Array.isArray(timespan) && !this.showDateRangePicker) {
      this.showDateRangePicker = true;
    } else if (this.selectedDevices.length) {
      // Fetch events again with new timespan
      this.fetchEventsForDevices(
        this.selectedDevices,
        this.dateRangeForSelectedTimespan
      );
    }
  }

  signOut() {
    auth.signOut();
  }
}
</script>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
.logo {
  height: 100%;
  background-image: url(./assets/tko-logo.svg);
  background-size: contain;
  min-width: 300px;
}
.summary-bubbles {
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: baseline;
  justify-content: space-evenly;
}
.selectors {
  min-height: 100px;
}
.event-summary {
  font-weight: bolder;
  color: white;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  user-select: none;
  > span:first-child {
    font-size: 25px;
    line-height: 25px;
    padding-top: 30px;
  }
  > span:last-child {
  }
  &.normal {
    background: #11a84c;
  }
  &.errored {
    background: #b8860b;
  }
  &.fever {
    background: #a81c11;
  }
}
</style>
