<template>
  <v-card>
    <v-card-title class="d-flex align-center justify-space-between">
      Devices Overview
      <div>
        <v-dialog
          v-if="isAdmin"
          v-model="newItemDialog"
          max-width="500px"
          persistent
        >
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              color="primary"
              dark
              class="my-2 mr-4"
              v-bind="attrs"
              v-on="on"
            >
              New Device
              <v-icon class="ml-1 mb-1"> mdi-plus </v-icon>
            </v-btn>
          </template>
          <v-card>
            <v-card-title>
              <span class="text-h5">Create New Device</span>
            </v-card-title>
            <v-card-text>
              <v-container>
                <v-row>
                  <v-col cols="6" sm="3" md="6">
                    <v-text-field
                      v-model="newDeviceId"
                      label="Device Id"
                    ></v-text-field>
                  </v-col>
                  <v-col cols="6" sm="3" md="6">
                    <v-text-field
                      v-model="newDeviceLabel"
                      label="Label Name"
                    ></v-text-field>
                  </v-col>
                </v-row>
                <v-row>
                  <v-select
                    :items="invitedUsers"
                    v-model="selectedUsers"
                    label="users"
                    item-text="email"
                    item-value="email"
                    multiple
                    chips
                    light
                    max-height="400"
                  >
                  </v-select>
                </v-row>
              </v-container>
            </v-card-text>

            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="blue darken-1" text v-on:click="close">
                Cancel
              </v-btn>
              <v-btn color="blue darken-1" text v-on:click="save"> Save </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
        <v-menu v-if="isAdmin" offset-y class="ml-8">
          <template v-slot:activator="{ on, attrs }">
            <v-btn color="grey lighten-5" v-bind="attrs" v-on="on" class="mr-6">
              Action
              <v-icon class="mb-1"> mdi-menu-down </v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-list-item>
              <v-list-item-title>Delete</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
    </v-card-title>
    <v-data-table
      :items="devices"
      :headers="headers"
      :items-per-page="20"
      hide-default-footer
      :show-select="isAdmin"
      single-select
      max-height="400"
      fixed-header
      dense
    >
      <template v-slot:[`item.name`]="{ item }">
        <v-edit-dialog
          :return-value="item.name"
          v-on:save="deviceChangeName(item, item.name)"
          large
        >
          <v-row>
            {{ item.name }}
            <v-icon small class="mx-1"> mdi-pencil</v-icon>
          </v-row>
          <template v-slot:input>
            <v-text-field
              v-model="item.name"
              :label="item.name"
              :rules="[validate]"
              single-line
              clearable
              counter
            ></v-text-field>
          </template>
        </v-edit-dialog>
      </template>
      <template v-slot:[`item.alerts`]="{ item }" align="center">
        <div class="d-flex justify-center">
          <v-checkbox
            v-model="item.alerts"
            v-on:click="updateDeviceAlerts(item.id, item.alerts)"
          ></v-checkbox>
        </div>
      </template>
      <template v-slot:[`item.invitedUsers`]="{ item }" align="center">
        <div class="d-flex justify-center">
          <v-menu offset-y :close-on-content-click="false">
            <template v-slot:activator="{ on, attrs }">
              <v-btn
                icon
                class="my-2"
                v-bind="attrs"
                v-on="on"
                :disabled="invitedUsers.length === 0"
              >
                <v-icon> mdi-format-list-bulleted-square </v-icon>
              </v-btn>
            </template>
            <v-list max-height="400" class="overflow-y-auto">
              <v-list-item v-for="user in invitedUsers" :key="user.username">
                <v-list-item-title>{{ user.email }}</v-list-item-title>
                <v-checkbox
                  :input-value="userHasDevice(user.devices, item.id)"
                  v-on:click="toggleDeviceForUser(item, user)"
                ></v-checkbox>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </template>
    </v-data-table>
  </v-card>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import { Device, User } from "@/model/db-handler";

export default Vue.extend({
  props: {
    isAdmin: Boolean,
    devices: Array as PropType<Record<string, Device>[]>,
    invitedUsers: Array as PropType<User[]>,
    updateDeviceName: Function as PropType<
      (device: string, newName: string) => string
    >,
    updateDeviceAlerts: Function as PropType<
      (device: string, alerts: boolean) => Promise<void>
    >,
    toggleDeviceForUser: Function as PropType<
      (device: Device, user: User) => Promise<void>
    >,
  },
  data() {
    return {
      newItemDialog: false,
      usersDialog: false,
      selectedUsers: [],
      newDeviceId: "",
      newDeviceLabel: "",
    };
  },
  computed: {
    headers() {
      const headers = [
        { text: "Label Id", value: "label", width: 165 },
        { text: "Name", value: "name", width: 165 },
        { text: "Notification", value: "alerts", align: "center", width: 105 },
      ];

      if (this.isAdmin) {
        const [salt, invitedUsers] = this.isAdmin
          ? [
              { text: "Salt Id", value: "id", width: 105 },
              { text: "Invited Users", value: "invitedUsers", align: "center" },
            ]
          : [];
        return [salt, ...headers, invitedUsers];
      }
      return headers;
    },
  },
  methods: {
    validate(input: string): boolean | string {
      if (input) {
        return input.length < 20 ? true : "Max 20 Characters";
      }
      return true;
    },
    userHasDevice(
      userDevices: Record<string, Device>,
      deviceId: string
    ): boolean {
      const userDevice = Object.values(userDevices).find((device) => {
        return device.id === deviceId;
      });
      return userDevice ? !userDevice.disable : false;
    },
    deviceChangeName(device: Device, newName: string) {
      const name = newName ? newName : device.id;
      this.updateDeviceName(device.id, name);
      device.name = name;
      return name;
    },
    save() {
      const device: Device = {
        id: this.newDeviceId,
        label: this.newDeviceLabel,
        name: this.newDeviceLabel,
        alerts: false,
        disable: false,
      };

      this.selectedUsers.forEach((user) => {
        const currUser = this.invitedUsers.find(({ email }) => user === email);
        if (currUser) {
          console.log(currUser, device);
          this.toggleDeviceForUser(device, currUser);
        }
      });

      this.selectedUsers = [];
      this.newDeviceId = "";
      this.newDeviceLabel = "";
      this.newItemDialog = false;
    },
    close() {
      this.selectedUsers = [];
      this.newDeviceId = "";
      this.newDeviceLabel = "";
      this.newItemDialog = false;
    },
  },
});
</script>
