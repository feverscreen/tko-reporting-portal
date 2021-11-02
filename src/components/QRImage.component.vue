<template>
  <v-card>
    <v-container class="flex-d align-center">
      <canvas ref="qrImage"></canvas>
      ID: {{ id }}
    </v-container>
  </v-card>
</template>

<script lang="ts">
import Vue from "vue";
import QRCode from "qrcode";
export default Vue.extend({
  props: {
    id: String,
  },
  mounted: async function () {
    QRCode.toCanvas(this.$refs.qrImage, this.id);
  },
});
</script>
