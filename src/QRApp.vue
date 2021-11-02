<template>
  <main ref="qrContainer" class="qr-container">
    <div class="qr-header">
      <h1 class="qr-id">{{ id }}</h1>
    </div>
    <canvas class="qr-image" ref="qrImage"></canvas>
    <div class="qr-bottom">
      <div class="qr-stats-container">
        <div>
          <h2>Last Scanned</h2>
          <p style="margin-top: 0.2em">{{ lastScanned }}</p>
        </div>
        <div class="tko-temp-container">
          <h1>{{ avgTemp }}</h1>
          <p>Avg. Temp</p>
        </div>
        <apexcharts type="area" :options="chartOptions" :series="events" />
      </div>
    </div>
    <img class="tko-image" src="/tko_icon_x512.png" alt="TKO logo" />
    <div class="qr-corners">
      <img src="/corner-cascade.svg" alt="TKO logo" />
      <img
        style="transform: rotate(90deg); right: 0"
        src="/corner-cascade.svg"
        alt="TKO logo"
      />
      <img
        style="transform: rotate(180deg); right: 0; bottom: 0"
        src="/corner-cascade.svg"
        alt="TKO logo"
      />
      <img
        style="transform: rotate(-90deg); left: 0; bottom: 0"
        src="/corner-cascade.svg"
        alt="TKO logo"
      />
    </div>
  </main>
</template>
<script lang="ts">
import { Vue, Component } from "vue-property-decorator";
import QRCode from "qrcode";
import { decryptHash, getUserEvents, formatTime } from "@/model/utils";
import { chartOptions } from "@/components/QRUserStats.component.vue";
import VueApexCharts from "vue-apexcharts";
@Component({
  components: {
    apexcharts: VueApexCharts,
  },
})
export default class QRApp extends Vue {
  id = "";
  org = "";
  hash = "";
  lastScanned = "";
  events = [] as {
    name: string;
    data: { x: string; y: number }[];
  }[];
  avgTemp = "0.0";
  chartOptions = {
    ...chartOptions,
    chart: {
      ...chartOptions.chart,
      width: "100%",
    },
    legend: { show: false },
    yaxis: { title: "", decimalsInFloat: 1 },
  };

  $refs!: {
    qrImage: HTMLCanvasElement;
    qrContainer: HTMLElement;
  };
  async getQRCode(): Promise<string> {
    const queryCode =
      this.$route.params.id ?? this.$router.currentRoute.query["code"];
    const storedHash = window.localStorage.getItem("qrHash");
    const id = window.localStorage.getItem("qrCode");

    if (storedHash === queryCode) {
      const qrid = window.localStorage.getItem("qrCode") ?? "";
      this.id = id?.split("-")[1] ?? qrid;
      return qrid;
    } else {
      const code = await decryptHash(queryCode.replace("tko-", ""));
      if (code !== "Invalid") {
        const [org, id] = code.split("-");
        window.localStorage.setItem("qrHash", queryCode);
        window.localStorage.setItem("qrCode", code);
        this.id = id;
        this.org = org;
        this.hash = queryCode;
        return code;
      } else {
        return "Invalid";
      }
    }
  }

  parseUserEvents(events: { date: Date; reading: number }[]) {
    const datesToTemp: {
      [key: string]: {
        high: { reading: number; date: string };
        low: { reading: number; date: string };
      };
    } = {};
    events.forEach(({ date, reading }) => {
      const eventDate = date.toDateString();
      if (eventDate in datesToTemp) {
        const currTemps = datesToTemp[eventDate];
        if (currTemps.high.reading < reading) {
          currTemps.high = { reading, date: date.toString() };
        } else if (currTemps.low.reading > reading) {
          currTemps.low = { reading, date: date.toString() };
        }
      } else {
        const newDateReading = { reading, date: date.toString() };
        datesToTemp[eventDate] = {
          high: newDateReading,
          low: newDateReading,
        };
      }
    });
    const highData = Object.entries(datesToTemp).map(([date, { high }]) => ({
      x: high.date,
      y: high.reading,
    }));
    const lowData = Object.entries(datesToTemp).map(([date, { low }]) => ({
      x: low.date,
      y: low.reading,
    }));
    return [
      { name: "high", data: highData },
      { name: "low", data: lowData },
    ];
  }
  async mounted() {
    const qrCode = await this.getQRCode();
    if (qrCode) {
      // ID starts with "tko-" for validation on device;
      const { clientWidth, clientHeight } = this.$refs.qrContainer;
      const width = Math.min(clientWidth, clientHeight) * 0.85;
      if (qrCode !== "Invalid") {
        QRCode.toCanvas(this.$refs.qrImage, "tko-" + qrCode, {
          margin: 0,
          width,
        });
        const queryCode =
          this.$route.params.id ?? this.$router.currentRoute.query["code"];

        const events = await getUserEvents(queryCode.replace("tko-", ""));
        this.events = this.parseUserEvents(events);
        if (events.length > 0) {
          const lastestDate = new Date(
            this.events[0].data[this.events[0].data.length - 1].x
          );
          this.lastScanned = `${lastestDate.toLocaleTimeString()} ${lastestDate.toLocaleDateString(
            "en-NZ"
          )}`;
        } else {
          this.lastScanned = "Never";
        }
        this.avgTemp = (
          events.reduce((prev, { reading }) => prev + Number(reading), 0) /
          events.length
        ).toFixed(1);
      }
    }
  }
}
</script>
<style lang="scss" scoped>
h1 {
  font-size: calc(24px + (28 - 24) * ((100vw - 320px) / (860 - 320)));
}
h2 {
  font-size: calc(20px + (28 - 20) * ((100vw - 320px) / (860 - 320)));
}
h3 {
  font-size: calc(16px + (28 - 16) * ((100vw - 320px) / (860 - 320)));
}
.qr-container {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100vw;
  height: 100vh;
}
.qr-id {
  width: 100%;
  padding: 3.5vh;
  padding-bottom: 1vh;
  align-self: center;
  text-align: center;
  overflow-wrap: break-word;
  border-radius: 0.5em;
}
.qr-header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.qr-bottom {
  display: flex;
  align-items: center;
  flex-grow: 2;
}
.qr-image {
  object-fit: contain;
  width: 100%;
}
.tko-temp-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  align-self: center;
}
.qr-stats-container {
  display: flex;
  min-height: 205px;
  background: white;
  justify-content: space-evenly;
  margin: 7.5vw;
  padding: 0.8em 1em 0em 1em;
  border: solid 3px #ecf4ff;
  box-shadow: 2.9px 1.4px 4.1px rgb(0 0 0 / 2%),
    6.5px 3.1px 9.8px rgb(0 0 0 / 1%), 17px 8px 26px rgb(0 0 0 / 13%);
  border-radius: 1em;
  flex-wrap: wrap;
  @media (max-height: 680px) and (min-height: 500px) {
    margin-top: 0;
  }
}
.tko-image {
  position: absolute;
  bottom: 0;
  width: 10vh;
  z-index: -1;
  @media (max-height: 710px) {
    display: none;
  }
}
.qr-corners {
  width: 100%;
  height: 100%;
  position: absolute;
  z-index: -1;
  img {
    width: 45vw;
    max-width: 45vh;
    position: absolute;
  }
}
</style>
