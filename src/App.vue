<template>
  <v-app v-if="loggedInStatus.loggedIn">
    <v-app-bar color="white" app>
      <div class="logo" />
      <v-spacer />
      {{ userEmail }}
      <span>&nbsp;</span>
      <v-btn text color="#086797" @click="signOut"> Sign out </v-btn>
    </v-app-bar>
    <v-container>
      <v-row align="center">
        <v-toolbar flat>
          <v-spacer />
          <v-btn text @click="showUsersOverview = true"> Edit Users </v-btn>
          <v-btn text @click="showDevicesOverview = true"> Edit Devices </v-btn>
          <v-btn text @click="exportCsv"> Export CSV </v-btn>
        </v-toolbar>
      </v-row>
      <v-dialog ref="dialog" v-model="showUsersOverview" :max-width="400">
        <usersOverview
          :users="qrUsers"
          :updateQRUsers="dbHandler.updateQRUsers"
        />
      </v-dialog>
      <v-dialog
        ref="dialog"
        v-model="showDevicesOverview"
        :max-width="isAdmin ? 800 : 450"
      >
        <devicesOverview
          :devices="Object.values(devices)"
          :isAdmin="isAdmin"
          :invitedUsers="invitedUsers"
          :delete-device="deleteDevice"
          :update-device-name="dbHandler.updateDeviceName"
          :update-device-label="dbHandler.updateDeviceLabel"
          :update-device-alerts="dbHandler.updateDeviceAlerts"
          :update-device-record="dbHandler.updateDeviceRecord"
          :toggle-device-for-user="dbHandler.toggleDeviceForUser"
        />
      </v-dialog>
      <v-row>
        <v-col>
          <v-btn-toggle
            class="pt-3"
            v-model="selectedTimespan"
            mandatory
            @change="selectedTimespanChanged"
          >
            <v-btn :value="timespans[0].value">Last Hour</v-btn>
            <v-btn :value="timespans[1].value">Today</v-btn>
            <v-btn :value="timespans[2].value">This Week</v-btn>
            <v-btn
              :value="timespans[3].value"
              @click="showDateRangePicker = true"
              >Custom</v-btn
            >
          </v-btn-toggle>
          <v-row v-if="isCustomTimespan">
            <v-dialog ref="dialog" v-model="showDateRangePicker" width="290px">
              <template #activator="{ on, attrs }">
                <v-row align="center" class="mx-16">
                  <v-text-field
                    :value="timespans[timespans.length - 1].value[0]"
                    style="width: 8em"
                    class="pr-2"
                    label="Custom date range"
                    prepend-icon="mdi-calendar"
                    readonly
                    v-bind="attrs"
                    v-on="on"
                  />
                  <v-text-field
                    :value="timespans[timespans.length - 1].value[1]"
                    style="width: 8em"
                    readonly
                    v-bind="attrs"
                    v-on="on"
                  />
                </v-row>
              </template>
              <v-date-picker
                v-model="timespans[timespans.length - 1].value"
                range
              >
                <v-spacer />
                <v-btn text color="primary" v-on:click="cancelCustomTime">
                  Cancel
                </v-btn>
                <v-btn text color="primary" v-on:click="saveCustomTime">
                  OK
                </v-btn>
              </v-date-picker>
            </v-dialog>
          </v-row>
        </v-col>
        <v-col>
          <v-select
            v-model="selectedDevices"
            class="selectors"
            label="devices"
            :items="deviceIds"
            item-text="name"
            item-value="id"
            multiple
            chips
            filled
            light
            @change="selectedDevicesChanged"
          >
            <template #prepend-item>
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
              <v-divider class="mt-2" />
            </template>
          </v-select>
        </v-col>
      </v-row>
      <v-row v-if="selectedTimespan && selectedDevices.length">
        <div v-if="dataIsLoading && !eventItems.length" class="summary-bubbles">
          Loading...
        </div>
        <div v-else-if="eventItems.length !== 0" class="summary-bubbles">
          <h4>{{ eventItems.length }} screenings</h4>
          <div v-if="numNormalEvents !== 0" class="event-summary normal">
            <span>
              {{ numNormalEvents }}
            </span>
            <span>normal</span>
          </div>
          <div
            v-if="numFeverEvents !== 0"
            class="event-summary fever"
            v-bind:class="{ 'event-selected': showFilteredEvents }"
            v-on:click="filterFeverEvents"
          >
            <span>{{ numFeverEvents }}</span>
            <span>fever</span>
          </div>
          <div v-if="numErrorEvents !== 0" class="event-summary errored">
            <span> {{ numErrorEvents }} </span><span>errors</span>
          </div>
        </div>
      </v-row>
      <v-row v-if="selectedTimespan && selectedDevices.length" align="center">
        <v-col>
          <apexchart
            :temperatures="temperatures"
            :get-color-for-item="getColorForItem"
          />
          <v-data-table
            fixed-header
            :loading="dataIsLoading"
            :headers="headers"
            :items="showFilteredEvents ? filterEvents : events"
            :items-per-page="10"
            sort-by="time"
            sort-desc
            :custom-sort="sortItems"
            :no-data-text="'No events found for selected timespan'"
          >
            <template #[`item.displayedTemperature`]="{ item }">
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
import devicesOverview from "@/components/DevicesOverview.component.vue";
import usersOverview from "@/components/UsersOverview.component.vue";
import { CognitoAuth, CognitoAuthSession } from "amazon-cognito-auth-js";
import { DataTableHeader } from "vuetify";
import { formatDate } from "@/model/utils";
import RequestHandler from "@/model/request-handler";
import DatabaseHandler, {
  Device,
  EventTableItem,
  User,
} from "@/model/db-handler";
import CognitoIdentity from "@/model/cognito-identity";
import { MIN_ERROR_THRESHOLD } from "@/constants";
import downloadCsv from "download-csv";

Vue.use(VueApexCharts);

const HostName = `${window.location.protocol}//${window.location.host}`;

const auth = new CognitoAuth({
  ClientId: "7ijdj7d02sn1jmta9blul42373",
  AppWebDomain: "tekahuora.auth.ap-southeast-2.amazoncognito.com",
  TokenScopesArray: ["email", "openid", "aws.cognito.signin.user.admin"],
  RedirectUriSignIn: HostName,
  RedirectUriSignOut: HostName,
});
const cognitoIdentity = CognitoIdentity(auth);
const dbHandler = DatabaseHandler(
  auth.getUsername(),
  cognitoIdentity.credentials,
  cognitoIdentity.isAdmin
);
const today = new Date();
const todayDate = `${today.getFullYear()}-${
  today.getMonth() + 1
}-${today.getDate()}`;

interface SavedSettings {
  devices: string[];
  timespan: { start: number } | [string, string];
}

// If the API response returns 401, logout so that they'll be redirected to the cognito sign-in page.
// Set the auth token for axios to use when the component is created.

@Component({
  components: { apexchart: ScreeningChart, usersOverview, devicesOverview },
})
export default class App extends Vue {
  private loggedInStatus: {
    loggedIn: boolean;
    currentUser: string | null;
  } = { loggedIn: false, currentUser: null };
  private devices: Record<string, Device> = {};
  private invitedUsers: User[] = [];
  private qrUsers: string[] = [];
  private selectedDevices: string[] = [];
  private eventItems: EventTableItem[] = [];
  private dataIsLoading = false;
  private showDateRangePicker = false;
  private showUsersOverview = false;
  private showDevicesOverview = false;
  private requestHandler = RequestHandler(auth);
  private dbHandler = dbHandler;
  private isAdmin = cognitoIdentity.isAdmin;
  private toggleTimespan = 0;

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
      text: "This week",
      value: { start: -(24 * 7) },
    },
    {
      text: "Custom",
      value: [todayDate, todayDate], // Concrete date ranges
    },
  ];

  private selectedTimespan: { start: number } | string[] =
    this.timespans[1].value;

  // noinspection JSMismatchedCollectionQueryUpdate
  private headers: DataTableHeader[] = [
    {
      text: "Device",
      value: "device",
      width: 240,
    },
    {
      text: "Screened Temp C",
      value: "displayedTemperature",
      width: 140,
    },
    {
      text: "Fever Threshold C",
      value: "threshold",
      width: 120,
    },
    {
      text: "Time",
      value: "time",
      width: 240,
    },
  ];

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
    return Object.values(this.devices).filter(({ disable }) => !disable);
  }

  get dateRangeForSelectedTimespan(): {
    startDate: string;
    endDate?: string;
  } {
    if (!Array.isArray(this.selectedTimespan) && this.selectedTimespan.start) {
      const range = this.selectedTimespan;
      // we have a relative range.
      const startDate = formatDate(
        new Date(new Date().getTime() + 1000 * 60 * 60 * range.start)
      );
      return { startDate };
    } else {
      const customRange = this.timespans[this.timespans.length - 1]
        .value as string[];
      let [start, end] = customRange;
      if (end < start) {
        // Make sure end is always greater or equal than start.
        start = end;
        end = start;
      }

      // Add timezone offsets for NZ
      const offset = new Date().getTimezoneOffset() * 60 * 1000;
      const startDate = formatDate(new Date(Date.parse(start) + offset));
      const endDate = formatDate(
        new Date(Date.parse(end) + 1000 * 60 * 60 * 24 + offset)
      );
      return { startDate, endDate };
    }
  }

  get events(): EventTableItem[] {
    dbHandler.getDeviceEvents("fs-1217", { startDate: "", endDate: "" });

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
    return (
      auth.getCachedSession().getIdToken().decodePayload() as {
        email: string;
      }
    ).email;
  }

  cancelCustomTime() {
    this.showDateRangePicker = false;
  }

  saveCustomTime() {
    this.selectedTimespanChanged(this.selectedTimespan as string[]);
    this.showDateRangePicker = false;
  }

  created(): void {
    auth.userhandler = {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      onSuccess: (_session: CognitoAuthSession): void => {
        this.loggedInStatus.currentUser = auth.getCurrentUser();
        this.loggedInStatus.loggedIn = true;
        if (window.location.href.includes("?code=")) {
          window.location.href = HostName;
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

  sortItems(
    items: EventTableItem[],
    index: (string | undefined)[],
    isDesc: (boolean | undefined)[]
  ): EventTableItem[] {
    if (index[0] !== undefined) {
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

  deleteDevice(device: string) {
    this.dbHandler.deleteDevice(device);
    Vue.delete(this.devices, device);
    this.selectedDevicesChanged;
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

  getColorForItem(item: EventTableItem): string {
    if (item.displayedTemperature > MIN_ERROR_THRESHOLD) {
      return "#B8860B";
    }
    if (item.displayedTemperature > item.threshold) {
      return "#a81c11";
    }
    return "#11a84c";
  }

  async init(): Promise<void> {
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
          this.selectedTimespan =
            this.timespans[this.timespans.length - 1].value;
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
    }
    this.devices = await dbHandler.getDevices();
    this.invitedUsers = await dbHandler.getInvitedUsers();
    this.qrUsers = await dbHandler.getQRUsers();

    this.selectedDevices = this.selectedDevices.filter((device) =>
      Object.keys(this.devices).includes(device)
    );
    if (this.selectedDevices.length) {
      await this.fetchEventsForDevices(
        this.selectedDevices,
        this.dateRangeForSelectedTimespan
      );
    }
    // Periodically refresh.
    setInterval(async () => {
      const now = new Date().getTime();
      if (now - this.requestHandler.lastApiRequestTime > 1000 * 50) {
        if (this.selectedDevices.length) {
          await this.fetchEventsForDevices(
            this.selectedDevices,
            this.dateRangeForSelectedTimespan
          );
        } else {
          this.devices = await dbHandler.getDevices();
        }
      }
    }, 1000 * 60);
  }

  async fetchEventsForDevices(
    devices: string[],
    timeFrame: { startDate: string; endDate?: string }
  ): Promise<void> {
    this.dataIsLoading = true;
    const { startDate, endDate } = timeFrame;
    const allEvents = await Promise.all(
      devices.map((device) =>
        this.dbHandler.getDeviceEvents(device, { startDate, endDate })
      )
    );
    const mappedEvents = allEvents.flat();
    this.eventItems = mappedEvents
      .filter((item: EventTableItem) => item.displayedTemperature > 0)
      .sort((a: EventTableItem, b: EventTableItem) =>
        a.timestamp < b.timestamp ? 1 : -1
      );

    this.dataIsLoading = false;
  }

  selectAllDevices(): void {
    if (this.deviceIds.length === this.selectedDevices.length) {
      this.selectedDevices = [];
      this.selectedDevicesChanged([]);
    } else {
      const deviceIds = this.deviceIds.map((val) => val.id);
      this.selectedDevices = deviceIds;
      this.selectedDevicesChanged(deviceIds);
    }
  }

  selectedDevicesChanged(deviceIds: string[]): void {
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
          startDate: Date | number;
          endDate: Date | number | undefined;
        }
      | string[]
  ): void {
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

  private showFilteredEvents = false;
  private filterEvents: EventTableItem[] = [];
  filterFeverEvents(): void {
    this.showFilteredEvents = !this.showFilteredEvents;
    this.filterEvents = this.showFilteredEvents
      ? this.events.filter((item) => item.result === "Fever")
      : this.events;
  }

  signOut(): void {
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
  &.normal {
    background: #11a84c;
  }
  &.errored {
    background: #b8860b;
  }
  &.fever {
    cursor: pointer;
    background: #a81c11;
    &.event-selected {
      box-shadow: 0px 0px 0px 7px rgba(227, 136, 136, 0.75);
    }
    transition: all 0.2s ease-in-out;
  }
}
</style>
