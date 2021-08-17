<template>
  <v-card>
    <v-card-title
      v-if="isSuperAdmin"
      class="d-flex align-center justify-space-between"
    >
      Admins Overview
    </v-card-title>
    <v-data-table
      v-if="isSuperAdmin"
      :items="adminUsers"
      :headers="adminHeaders"
      dense
    >
      <template v-slot:[`item.organization`]="{ item }">
        <v-select
          v-model="item.organization"
          @change="(input) => changeOrg(input, item.username)"
          :items="organizations"
        >
          <template v-slot:append-item>
            <v-edit-dialog
              large
              @save="addNewOrg(item)"
              @close="closeNewOrg()"
              :return-value="item.organization"
            >
              <v-btn block large text color="blue" light>
                Add Organization
                <v-icon class="ml-1"> mdi-plus </v-icon>
              </v-btn>
              <template v-slot:input>
                <v-text-field
                  v-model="tempOrg"
                  :rules="[validateOrg]"
                  single-line
                  clearable
                  counter
                ></v-text-field>
              </template>
            </v-edit-dialog>
          </template>
        </v-select>
      </template>
    </v-data-table>
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
      :headers="qrHeaders"
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
              :rules="[validateQR]"
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
import { Admin } from "@/model/db-handler";
import QRImage from "@/components/QRImage.component.vue";
import QRCode from "qrcode";
import printJS from "print-js";

export default Vue.extend({
  props: {
    isSuperAdmin: Boolean,
    adminUsers: Array as PropType<Admin[]>,
    users: Array as PropType<string[]>,
    updateQRUser: Function as PropType<(org: string, userId: string) => void>,
    updateAdminOrg: Function as PropType<
      (adminId: string, organization: string) => void
    >,
  },
  components: {
    QRImage,
  },
  data: function () {
    return {
      newUserDialog: false,
      tempUsers: [] as { id: string }[],
      qrHeaders: [
        { text: "User ID", value: "id" },
        { text: "QR Code", value: "qr" },
      ],
      adminHeaders: [
        { text: "Email", value: "email" },
        { text: "Organization", value: "organization", width: "200px" },
      ],
      tempId: "",
      tempOrg: "",
    };
  },
  computed: {
    qrUsers: {
      get: function (): { id: string }[] {
        return [...this.users.map((id) => ({ id })), ...this.tempUsers];
      },
    },
    organizations: {
      get: function (): string[] {
        return this.adminUsers
          .map((user) => user.organization ?? "")
          .filter((val) => val);
      },
    },
  },
  methods: {
    addNewUser() {
      this.tempUsers.push({ id: "" });
      (this.$refs.tempEdit as any).isActive = true;
    },
    validateQR(input: string): boolean | string {
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
    validateOrg(input: string): boolean | string {
      if (input) {
        const duplicate =
          this.organizations.filter((id) => id === input).length !== 0;
        const long = input.length > 50;
        return !long && !duplicate
          ? true
          : long
          ? "Max Characters 50"
          : "Duplicate Name found";
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
    },
    async printQR(id: string) {
      const qrimg = await QRCode.toDataURL(
        this.$refs.qrImage as HTMLCanvasElement,
        id
      );
      printJS({ printable: qrimg, type: "image", imageStyle: "width:400px" });
    },
    closeNewOrg() {
      this.tempOrg = "";
    },
    addNewOrg(admin: Admin) {
      admin.organization = this.tempOrg;
      this.changeOrg(this.tempOrg, admin.username);
    },
    changeOrg(org: string, username: string) {
      this.updateAdminOrg(username, org);
    },
  },
});
</script>
