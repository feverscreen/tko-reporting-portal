<template>
  <apexcharts
    height="100"
    type="bar"
    :options="chartOptions"
    :series="temperatures"
  />
</template>

<script lang="ts">
import VueApexCharts from "vue-apexcharts";
import Vue, { PropType } from "vue";

export default Vue.extend({
  name: "ScreeningChart",
  components: {
    apexcharts: VueApexCharts,
  },
  props: {
    temperatures: Array as PropType<{ name: string; data: number[] }[]>,
    getColorForItem: Function,
  },
  data() {
    return {
      chartOptions: {
        chart: {
          offsetX: 0,
          offsetY: 0,
          id: "timeseries",
          toolbar: {
            show: false,
          },
          animations: {
            enabled: true,
            speed: 400,
            animateGradually: {
              enabled: true,
              delay: 16,
            },
          },
        },
        fill: {
          colors: [
            ({ dataPointIndex }: { dataPointIndex: number }) =>
              this.getColorForItem(this.temperatures[0].data[dataPointIndex]),
          ],
        },
        grid: {
          show: false,
        },
        dataLabels: {
          enabled: false,
        },
        tooltip: {
          enabled: false,
        },
        xaxis: {
          type: "numeric",
          labels: {
            show: false,
          },
          axisTicks: {
            show: false,
          },
        },
        yaxis: {
          labels: {
            show: false,
          },
          tickAmount: 10,
          min: 30,
          max: 50,
          axisTicks: {
            show: false,
          },
        },
      },
    };
  },
});
</script>
