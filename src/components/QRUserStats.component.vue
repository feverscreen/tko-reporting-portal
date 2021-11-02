<template>
  <v-card color="white">
    <v-card-title>Stats</v-card-title>
    <v-card-subtitle>{{ id.split("-").at(-1) }}</v-card-subtitle>
    <v-card-text>
      <h3>Average Temperature: {{ avgTemp }}</h3>
      <h3>
        Last Scanned:
        {{ lastScanned }}
      </h3>
      <apexcharts
        height="400"
        type="area"
        :options="chartOptions"
        :series="userTemps"
      />
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import Vue from "vue";
import VueApexCharts from "vue-apexcharts";
import UserInfo from "@/model/user-info";
export const chartOptions = {
  chart: {
    type: "area",
    height: 100,
    animations: {
      enabled: false,
    },
    toolbar: {
      show: false,
    },
  },
  dataLabels: {
    enabled: false,
  },
  stroke: {
    curve: "straight",
  },
  fill: {
    opacity: 0.8,
    type: "gradient",
    pattern: {
      style: ["verticalLines", "horizontalLines"],
      width: 5,
      height: 6,
    },
  },
  markers: {
    size: 5,
    hover: {
      size: 3,
    },
  },
  tooltip: {
    intersect: true,
    shared: false,
  },
  theme: {
    palette: "palette1",
  },
  xaxis: {
    type: "datetime",
  },
  yaxis: {
    title: {
      text: "Temperature",
    },
    decimalsInFloat: 1,
  },
};
export default Vue.extend({
  props: {
    qrid: String,
  },
  components: {
    apexcharts: VueApexCharts,
  },
  data: function () {
    return {
      dbHandler: UserInfo.state.databaseHandler!,
      events: [] as { date: Date; reading: number }[],
      id: this.qrid,
      chartOptions,
    };
  },
  async created() {
    if (this.qrid) {
      this.events = await this.dbHandler.getQRUserEvents(this.id);
    }
  },
  computed: {
    avgTemp: function (): number {
      if (this.events.length > 0) {
        const averageTemp = this.events.reduce(
          (avg, { reading }, _, { length }) => {
            return avg + reading / length;
          },
          0
        );
        return Number(averageTemp.toPrecision(4));
      }
      return 0;
    },
    userTemps: function (): {
      name: string;
      data: { x: string; y: number }[];
    }[] {
      const datesToTemp: {
        [key: string]: {
          high: { reading: number; date: string };
          low: { reading: number; date: string };
        };
      } = {};
      this.events.forEach(({ date, reading }) => {
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
    },
    lastScanned: function (): string {
      const sortedDates = this.events
        .slice()
        .sort((a, b) => (b.date as any) - (a.date as any));
      return sortedDates[0]?.date.toLocaleString() ?? "";
    },
  },
});
</script>
