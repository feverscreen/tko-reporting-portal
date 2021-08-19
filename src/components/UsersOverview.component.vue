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
        <v-menu offset-y class="ml-8">
          <template v-slot:activator="{ on, attrs }">
            <v-btn color="grey lighten-5" v-bind="attrs" v-on="on" class="mr-6">
              Action
              <v-icon class="mb-1"> mdi-menu-down </v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-dialog
              v-model="deleteUsersDialog"
              max-width="310px"
              persistent
            >
              <template v-slot:activator="{ on, attrs }">
                <v-btn text class="my-2 mr-4" v-bind="attrs" v-on="on">
                  Delete
                </v-btn>
              </template>
              <v-card class="flex row justify-center">
                <v-card-title>
                  <span class="text-h5">Delete Selected Users</span>
                </v-card-title>
                <v-card-text>
                  You will delete the User for all admins removing any saved
                  names. This does not delete events so you can add the user
                  later.
                </v-card-text>
                <v-card-actions>
                  <v-btn color="error" v-on:click="deleteSelectedUsers">
                    Delete Users
                  </v-btn>
                  <v-btn
                    color="blue darken-1"
                    text
                    v-on:click="deleteUsersDialog = false"
                  >
                    Cancel
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
          </v-list>
        </v-menu>
      </div>
    </v-card-title>
    <v-data-table
      v-model="selectedUsers"
      :items="qrUsers"
      :headers="qrHeaders"
      :items-per-page="20"
      show-select
      dense
    >
      <template v-slot:[`item.id`]="{ item }">
        <v-edit-dialog
          :ref="item.id ? item.id : 'tempEdit'"
          @close="saveUserId(item)"
          :return-value.sync="item.id"
        >
          <v-row>
            {{ item.id }}
            <v-icon small class="mx-1"> mdi-pencil</v-icon>
          </v-row>
          <template v-slot:input>
            <div class="d-flex flex-nowrap align-center">
            <v-text-field
              v-model="tempId"
              :label="item.id"
              :rules="[validateQR]"
              single-line
              clearable
              counter
            ></v-text-field>
              <v-btn @click="randomId" small class="ml-4">Random</v-btn>
          </div>
          </template>
        </v-edit-dialog>
      </template>
      <template v-slot:[`item.qr`]="{ item }">
        <v-dialog max-width="150" hide-overlay>
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
import {v4} from "uuid"

export default Vue.extend({
  props: {
    isSuperAdmin: Boolean,
    adminUsers: Array as PropType<Admin[]>,
    users: Array as PropType<string[]>,
    updateQRUser: Function as PropType<(qrId: string) => void>,
    deleteQRUsers: Function as PropType<(qrIds: string[]) => void>,
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
      deleteUsersDialog: false,
      tempUsers: [] as { id: string }[],
      selectedUsers: [] as {id: string}[],
      qrHeaders: [
        { text: "User ID", value: "id" },
        { text: "", value: "qr" },
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
      this.$nextTick(() => {
      (this.$refs.tempEdit as any).isActive = true;
      })
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
      this.tempUsers = [];
      this.updateQRUser(user.id);
      this.tempId = "";
    },
    async printQR(id: string) {
      const qrimg = await QRCode.toDataURL(
        this.$refs.qrImage as HTMLCanvasElement,
        `tko-${id}`
      );
      printJS({ printable: qrimg, type: "image", imageStyle: "width:350px" });
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
    deleteSelectedUsers() {
      const users = this.selectedUsers.map(val => val.id);
      this.deleteQRUsers(users)
      this.selectedUsers = [];
      this.deleteUsersDialog = false;
    },
    randomId() {
      this.tempId = v4();
    }
  },
});
</script>
