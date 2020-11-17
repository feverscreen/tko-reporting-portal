<template>
  <v-app v-if="loggedInStatus.loggedIn">
    <v-app-bar color="white" app>
      <div class="logo"></div>
      <v-spacer />
      {{ userEmail }}
      <v-btn
        @click="signOut"
        v-if="loggedInStatus.loggedIn"
        text
        color="#086797"
        >Sign out</v-btn
      >
    </v-app-bar>
    <v-container>
      <v-row align="center">
        <v-col>
          <v-select
            label="devices"
            v-if="devices.length > 1"
            :items="devices"
            v-model="selectedDevice"
            @change="selectedDevicesChanged"
            filled
            light
          />
        </v-col>
        <v-col>
          <v-select
            label="timespan"
            :items="timespans"
            filled
            light
            v-model="selectedTimespan"
            @change="selectedTimespanChanged"
          />
        </v-col>
      </v-row>
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
      <v-row v-if="selectedTimespan && selectedDevice">
        <div v-if="dataIsLoading" class="summary-bubbles">Loading...</div>
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
      <v-row align="center" v-if="selectedTimespan && selectedDevice">
        <v-col>
          <apexchart
            height="100"
            type="bar"
            :options="chartOptions"
            :series="temperatures"
          ></apexchart>
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
            <template v-slot:item.displayedTemperature="{ item }">
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
import { CognitoAuth, CognitoAuthSession } from "amazon-cognito-auth-js";
import { DataTableHeader } from "vuetify";
import { formatTime } from "@/utils";

Vue.use(VueApexCharts);

const hostName = `${window.location.protocol}//${window.location.host}`;
const auth = new CognitoAuth({
  ClientId: "7ijdj7d02sn1jmta9blul42373",
  AppWebDomain: "tekahuora.auth.ap-southeast-2.amazoncognito.com",
  TokenScopesArray: ["email", "openid", "aws.cognito.signin.user.admin"],
  RedirectUriSignIn: hostName,
  RedirectUriSignOut: hostName
});

const MIN_ERROR_THRESHOLD = 42.5;
const API_BASE =
  "https://3pu8ojk2ej.execute-api.ap-southeast-2.amazonaws.com/default";
// If the API response returns 401, logout so that they'll be redirected to the cognito sign-in page.
// Set the auth token for axios to use when the component is created.
const makeGetRequest = async (url: string): Promise<Response> => {
  // TODO(jon): We may need to refresh the token if the user has left the page open for a long time between requests?
  const oldToken = auth.getCachedSession().getIdToken();
  const { exp } = auth
    .getCachedSession()
    .getIdToken()
    .decodePayload() as any;
  const now = new Date().getTime() / 1000;
  const hasExpired = now > exp;
  console.log(now, exp, hasExpired);
  if (hasExpired) {
    console.log("Refreshing session");
    return new Promise((resolve, reject) => {
      auth.userhandler.onSuccess = async (session: CognitoAuthSession) => {
        const { exp } = session.getIdToken().decodePayload() as any;
        const now = new Date().getTime() / 1000;
        const r = fetch(`${API_BASE}${url}`, {
          method: "GET",
          headers: {
            Authorization: auth.getCachedSession().getIdToken().getJwtToken()
          }
        });
        resolve(r);
      };
      //auth.getSession();
      auth.onSuccessRefreshToken = (json: string) => {
        const session = JSON.parse(json);
        // Do something with this?
      };
      auth.refreshSession(
        auth
          .getCachedSession()
          .getRefreshToken()
          .getToken()
      );
    });
  } else {
    console.log("token expires in ", (exp - now) / 60);
    return fetch(`${API_BASE}${url}`, {
      method: "GET",
      headers: {
        Authorization: auth
          .getCachedSession()
          .getIdToken()
          .getJwtToken()
      }
    });
  }
  // TODO(jon): If we get a 401 response, log the user out.
};

const formatDate = (date: Date): string =>
  date
    .toISOString()
    .replace(/:/g, "_")
    .replace(/\./g, "_");

interface EventItem {
  meta: string;
  thermalRefRaw: number;
  sampleRaw: number;
  timestamp: Date;
  softwareVersion: string;
  threshold: number;
  displayedTemperature: number;
}

interface EventTableItem {
  displayedTemperature: number;
  threshold: number;
  result: "Fever" | "Normal" | "Error";
  timestamp: Date;
  time: string;
  [key: string]: string | number | Date;
}

interface DBNumber {
  N: string;
}
interface DBString {
  S: string;
}

interface DynamoEventItem {
  disp: number;
  fth: number;
  tsc: string;
}

const unwrapDynamoQuery = (data) => {
  for (const [key, val] of Object.entries(data)) {
    const type = typeof val;
    if (type === "object") {
      if (Array.isArray(val)) {
        for (let i = 0; i < val.length; i++) {
          val[i] = unwrapDynamoQuery(val[i]);
        }
      } else {
        if (val.hasOwnProperty("S")) {
          data[key] = val.S.trim();
        } else if (val.hasOwnProperty("N")) {
          data[key] = Number(val.N);
        }
      }
    }
  }
  return data;
};

@Component({
  components: { apexchart: VueApexCharts }
})
export default class App extends Vue {
  private loggedInStatus: {
    loggedIn: boolean;
    currentUser: string | null;
  } = { loggedIn: false, currentUser: null };
  private devices: string[] = [];
  private selectedDevice = "";
  private eventItems: EventTableItem[] = [];
  private dataIsLoading = false;
  private showDateRangePicker = false;
  private timespans = [
    {
      text: "Last hour",
      value: { start: -1 } // Relative hours to now.
    },
    {
      text: "Last 24 hours",
      value: { start: -24 }
    },
    {
      text: "Last week",
      value: { start: -(24 * 7) }
    },
    {
      text: "Custom",
      value: ["2020-10-01", "2020-10-04"] // Concrete date ranges
    }
  ];
  private selectedTimespan = this.timespans[1].value;

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
    return this.eventItems;
  }

  get isCustomTimespan(): boolean {
    return Array.isArray(this.selectedTimespan);
  }

  get resultsSummaryText(): string {
    return `${this.eventItems.length} total screenings, ${
      this.eventItems.filter(item => item.result === "Fever").length
    } screened as Fever`;
  }

  get numNormalEvents(): number {
    return this.eventItems.filter(item => item.result === "Normal").length;
  }

  get numErrorEvents(): number {
    return this.eventItems.filter(item => item.result === "Error").length;
  }

  get numFeverEvents(): number {
    return this.eventItems.filter(item => item.result === "Fever").length;
  }

  // noinspection JSMismatchedCollectionQueryUpdate
  private headers: DataTableHeader[] = [
    {
      text: "Screened Temp C",
      value: "displayedTemperature"
    },
    {
      text: "Fever Threshold C",
      value: "threshold"
    },
    {
      text: "Time",
      value: "time"
    }
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

  get chartOptions() {
    return {
      chart: {
        offsetX: 0,
        offsetY: 0,
        id: "timeseries",
        toolbar: {
          show: false
        },
        animations: {
          enabled: true,
          speed: 400,
          animateGradually: {
            enabled: true,
            delay: 16
          }
        }
      },
      fill: {
        colors: [
          ({ dataPointIndex }: { dataPointIndex: number }) =>
            this.getColorForItem(this.eventItems[dataPointIndex])
        ]
      },
      grid: {
        show: false
      },
      dataLabels: {
        enabled: false
      },
      tooltip: {
        enabled: false
      },
      xaxis: {
        type: "numeric",
        labels: {
          show: false
        },
        axisTicks: {
          show: false
        }
      },
      yaxis: {
        labels: {
          show: false
        },
        tickAmount: 10,
        min: 30,
        max: 50,
        axisTicks: {
          show: false
        }
      }
    };
  }

  get temperatures() {
    return [
      {
        name: "temperatures",
        // data: this.eventItems.map(({ displayedTemperature, timestamp }) => [
        //   timestamp.getTime(),
        //   displayedTemperature
        // ])
        data: this.eventItems.map(
          ({ displayedTemperature }) => displayedTemperature
        )
      }
    ];
  }

  get userEmail(): string {
    return (auth
      .getCachedSession()
      .getIdToken()
      .decodePayload() as { email: string }).email;
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
      }
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
    await this.fetchDevicesForUser();
  }

  async fetchEventsForDevice(
    device: string,
    range: { startDate: string | null; endDate: string | null }
  ) {
    this.dataIsLoading = true;
    let url = `/events?deviceId=${device}&type=Screen`;
    if (range.startDate) {
      url += `&startDate=${range.startDate}`;
    }
    if (range.endDate) {
      url += `&endDate=${range.endDate}`;
    }
    const response = await makeGetRequest(url);
    const events = await response.json();
    console.log(events);
    if (events.Items) {
      this.eventItems = Object.freeze(
        events.Items.map(
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
            return {
              //sampleRaw: Number(item.scrr.N),
              //meta: JSON.parse(item.meta.S),
              //softwareVersion: item.ver.S,
              //thermalRefRaw: Number(item.refr.N),
              timestamp: d,
              displayedTemperature: Number(displayedTemp.toFixed(2)),
              threshold: threshold,
              result:
                displayedTemp > MIN_ERROR_THRESHOLD
                  ? "Error"
                  : displayedTemp > threshold
                  ? "Fever"
                  : "Normal",
              time: formatTime(d)
            };
          }
        )
          .filter((item: EventTableItem) => item.displayedTemperature > 0)
          .sort((a: EventTableItem, b: EventTableItem) =>
            a.timestamp < b.timestamp ? 1 : -1
          )
      );
    }
    this.dataIsLoading = false;
  }

  async fetchDevicesForUser() {
    const devices = await makeGetRequest("/devices");
    //const d = await devices.json();
    //this.devices = d.devices;
    this.devices = await devices.json();
    if (this.devices.length === 1) {
      this.selectedDevice = this.devices[0];
      await this.fetchEventsForDevice(
        this.selectedDevice,
        this.dateRangeForSelectedTimespan
      );
    }
  }

  selectedDevicesChanged(deviceId: string) {
    this.fetchEventsForDevice(deviceId, this.dateRangeForSelectedTimespan);
  }

  selectedTimespanChanged(
    timespan:
      | {
          start: Date | number;
          end: Date | number | undefined;
        }
      | string[]
  ) {
    if (Array.isArray(timespan) && !this.showDateRangePicker) {
      this.showDateRangePicker = true;
    } else if (this.selectedDevice) {
      // Fetch events again with new timespan
      this.fetchEventsForDevice(
        this.selectedDevice,
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
