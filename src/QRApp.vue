<template>
  <main ref="qrContainer" class="qr-container">
    <h1 class="qr-id">{{id}}</h1>
    <canvas class="qr-image" ref="qrImage"></canvas>
    <div class="tko-image-container" >
      <img class="tko-image" src="/tko_icon_x512.png" alt="TKO logo">
    </div>
  </main>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import QRCode from "qrcode";

@Component
export default class QRApp extends Vue {
  private id = "";
  $refs!: {
    qrImage: HTMLCanvasElement,
    qrContainer: HTMLElement
  }
  getQRCode(): string {
    const queryCode = this.$route.params.id ?? this.$router.currentRoute.query["code"]
    const storageCode = window.localStorage.getItem("qrCode");
    if(typeof queryCode === "string") {
      window.localStorage.setItem("qrCode", queryCode);
      return queryCode;
    } else if (storageCode) {
      return storageCode
    } else {
      return ""
    }
  }
  mounted() {
    const qrCode = this.getQRCode();
    if (qrCode) {
      // ID starts with "tko-" for validation on device;
      this.id = qrCode.replace("tko-", "");
      const width = this.$refs.qrContainer.clientWidth - 40

      QRCode.toCanvas(this.$refs.qrImage, qrCode, {width});
    }
  }
}
</script>
<style lang="scss" scoped>
  .qr-container {
    display: flex;
    background: #58B947;
    flex-direction: column;
    align-items: center;
    width: 100vw;
    height: 100vh;
  }
  .qr-id {
    max-width: 90%;
    text-align: center;
    overflow-wrap: break-word;
    background: white;
    border-radius: 0.5em;
    padding: 0.4em;
    margin-left: 0.5em;
    margin-right: 0.5em;
    margin-top: 0.5em;
  }
  .qr-image {
    object-fit: contain;
    width: 100%;
    margin: 1em;
    border-radius: 2em;
  }
  .tko-image-container {
    width: 40%;
  }
  .tko-image {
    width: 100%;
    margin-top: 1em;
    border-radius: 100%;
  }
</style>
