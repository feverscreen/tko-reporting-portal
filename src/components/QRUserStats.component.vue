<template>
  <v-card color="white">
  <v-card-title>{{qrid}} Stats</v-card-title>
  <h1>
  Average Temperature: {{avgTemp}}
  </h1>
  <h1>
  Last Scanned: {{lastScanned}}
  </h1>
  </v-card>
</template>

<script lang="ts">
import Vue from "vue"
import UserInfo from "@/model/user-info"

export default Vue.extend({
  props: {
    qrid: String
  },
  data: function() {
    return {
      dbHandler: UserInfo.state.databaseHandler!,
      events: [] as {date: Date, reading: number}[]
    }
  },
  async created(){
    if (this.qrid) {
      this.events = await this.dbHandler.getQRUserEvents(this.qrid);
    }
  },
  computed: {
    avgTemp: function(): number {
        if (this.events.length > 0) {
          const averageTemp = this.events.reduce((avg, {reading}, _, {length}) => {
            return avg + reading / length;
          },0)
          console.log(averageTemp);
          return Number(averageTemp.toPrecision(4));
        }
        return 0;
    },
    lastScanned: function(): string {
      const sortedDates = this.events.slice().sort((a, b) => (b.date as any) - (a.date as any))
      return sortedDates[0]?.date.toLocaleString() ?? ""
    }
  }
})
</script>
