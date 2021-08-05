<template>
  <v-card>
    <v-card-title class="d-flex align-center justify-space-between">
      Users Overview
      <div>
        <v-btn color="primary" dark class="my-2 mr-4" @click="addNewUser">
          New User
          <v-icon class="ml-1 mb-1"> mdi-plus </v-icon>
        </v-btn>
      </div>
    </v-card-title>
    <v-data-table
      :items="qrUsers"
      :headers="headers"
      :items-per-page="20"
      dense
      show-select
    >
      <template v-slot:[`item.id`]="{ item }">
        <v-edit-dialog
          :ref="item.id ? item.id : 'tempEdit'"
          @close="saveUserId(item)"
          :return-value="item.id"
        >
          <v-row>
            {{ item.id }}
            <v-icon small class="mx-1"> mdi-pencil</v-icon>
          </v-row>
          <template v-slot:input>
            <v-text-field
              v-model="tempId"
              :label="item.id"
              :rules="[validate]"
              single-line
              clearable
              counter
            ></v-text-field>
          </template>
        </v-edit-dialog>
      </template>
      <template v-slot:[`item.qr`]="{ item }">
        <v-dialog max-width="130" hide-overlay>
          <template v-slot:activator="{ on, attrs }">
            <v-btn text v-bind="attrs" v-on="on"
              ><v-icon>mdi-qrcode</v-icon></v-btn
            >
          </template>
          <QRImage :id="item.id" />
        </v-dialog>
        <v-btn text @click="printQR(item.id)">
          <v-icon>mdi-printer</v-icon></v-btn
        >
      </template>
    </v-data-table>
    <canvas ref="qrImage" hidden></canvas>
  </v-card>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import { Device, User } from "@/model/db-handler";
import QRImage from "@/components/QRImage.component.vue";
import QRCode from "qrcode";
import printJS from "print-js";

export default Vue.extend({
  props: {
    users: Array as PropType<string[]>,
    updateQRUsers: Function as PropType<(userIds: string[]) => void>,
  },
  components: {
    QRImage,
  },
  data: function () {
    return {
      newUserDialog: false,
      tempUsers: [] as { id: string }[],
      headers: [
        { text: "User ID", value: "id" },
        { text: "QR Code", value: "qr" },
      ],
      tempId: "",
    };
  },
  computed: {
    qrUsers: {
      get: function (): { id: string }[] {
        return [...this.users.map((id) => ({ id })), ...this.tempUsers];
      },
    },
  },
  methods: {
    async addNewUser() {
      await this.tempUsers.push({ id: "" });
      (this.$refs.tempEdit as any).isActive = true;
    },
    validate(input: string): boolean | string {
      console.log(input);
      if (input) {
        const duplicate =
          this.qrUsers.filter(({ id }) => id === input).length !== 0;
        const long = input.length > 50;
        return !long && !duplicate
          ? true
          : long
          ? "Max Characters 50"
          : "Duplicate ID found";
      }
      return true;
    },
    saveUserId(user: { id: string }) {
      if (this.qrUsers.filter(({ id }) => id === this.tempId).length > 0) {
        this.tempUsers = [];
        return;
      }
      if (this.tempId) {
        user.id = this.tempId;
      } else {
        this.tempUsers = [];
        if (user.id === "") {
          return;
        }
      }
      this.tempId = "";
      this.updateQRUsers(
        this.qrUsers.map(({ id }) => id).filter((id) => id !== "")
      );
    },
    async printQR(id: string) {
      const qrimg = await QRCode.toDataURL(
        this.$refs.qrImage as HTMLCanvasElement,
        id
      );
      printJS({ printable: qrimg, type: "image", imageStyle: "width:400px" });
    },
  },
});
</script>
