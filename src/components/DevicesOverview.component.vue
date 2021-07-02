<template>
  <v-card>
    <v-card-title class="d-flex align-center justify-space-between">
      Devices Overview
      <div>
        <v-dialog
          v-if="isAdmin"
          v-model="newItemDialog"
          max-width="600px"
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
            <v-dialog
              v-if="isAdmin"
              v-model="deleteDevicesDialog"
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
                  <span class="text-h5">Delete Selected Devices</span>
                </v-card-title>
                <v-card-text>
                  You will delete the device for all users removing any saved
                  names. This does not delete events so you can add the device
                  later.
                </v-card-text>
                <v-card-actions class="">
                  <v-btn
                    color="blue darken-1"
                    text
                    v-on:click="deleteDevicesDialog = false"
                  >
                    Cancel
                  </v-btn>
                  <v-btn color="error" v-on:click="deleteSelectedDevices">
                    Delete Devices
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
          </v-list>
        </v-menu>
      </div>
    </v-card-title>
    <v-data-table
      :items="devices"
      v-model="selectedDevices"
      :headers="headers"
      :items-per-page="20"
      hide-default-footer
      :show-select="isAdmin"
      max-height="400"
      fixed-header
      dense
    >
      <template v-if="isAdmin" v-slot:[`item.label`]="{ item }">
        <v-edit-dialog
          :return-value="item.label"
          v-on:save="deviceChangeLabel(item, item.label)"
          large
        >
          <v-row>
            {{ item.label }}
            <v-icon small class="mx-1"> mdi-pencil</v-icon>
          </v-row>
          <template v-slot:input>
            <v-text-field
              v-model="item.label"
              :label="item.label"
              :rules="[validate]"
              single-line
              clearable
              counter
            ></v-text-field>
          </template>
        </v-edit-dialog>
      </template>
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
        <div class="pl-3">
          <v-checkbox
            v-model="item.alerts"
            v-on:click="updateDeviceAlerts(item.id, item.alerts)"
          ></v-checkbox>
        </div>
      </template>
      <template v-slot:[`item.record`]="{ item }" align="center">
        <div class="pl-3">
          <v-checkbox
            v-model="item.record"
            v-on:click="updateDeviceRecord(item.id, item.record)"
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
    devices: Array as PropType<Device[]>,
    invitedUsers: Array as PropType<User[]>,
    deleteDevice: Function as PropType<(device: string) => Promise<void>>,
    updateDeviceName: Function as PropType<
      (device: string, newName: string) => Promise<string>
    >,
    updateDeviceLabel: Function as PropType<
      (device: string, newLabel: string) => Promise<string>
    >,
    updateDeviceAlerts: Function as PropType<
      (device: string, alerts: boolean) => Promise<void>
    >,
    updateDeviceRecord: Function as PropType<
      (device: string, record: boolean) => Promise<void>
    >,
    toggleDeviceForUser: Function as PropType<
      (device: Device, user: User) => Promise<void>
    >,
  },
  data() {
    return {
      newItemDialog: false,
      deleteDevicesDialog: false,
      usersDialog: false,
      selectedUsers: [],
      selectedDevices: [] as Device[],
      newDeviceId: "",
      newDeviceLabel: "",
    };
  },
  computed: {
    headers() {
      const headers = [
        { text: "Label Id", value: "label", width: 165 },
        { text: "Name", value: "name", width: 165 },
        { text: "Notification", value: "alerts", align: "center", width: 125 },
      ];

      if (this.isAdmin) {
        const [salt, invitedUsers, record] = this.isAdmin
          ? [
              { text: "Salt Id", value: "id", width: 105 },
              { text: "Invited Users", value: "invitedUsers", align: "center" },
              {
                text: "Record",
                value: "record",
                align: "center",
                width: 105,
              },
            ]
          : [];
        return [salt, ...headers, record, invitedUsers];
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
    deviceChangeLabel(device: Device, newLabel: string) {
      const label = newLabel ? newLabel : device.id;
      this.updateDeviceLabel(device.id, label);
      device.label = label;
      return label;
    },
    deviceChangeName(device: Device, newName: string) {
      const name = newName ? newName : device.label;
      this.updateDeviceName(device.id, name);
      device.name = name;
      return name;
    },
    deleteSelectedDevices() {
      this.selectedDevices.forEach((device) => {
        this.deleteDevice(device.id);
      });
      this.selectedDevices = [];
      this.deleteDevicesDialog = false;
    },
    save() {
      const device: Device = {
        id: this.newDeviceId,
        label: this.newDeviceLabel,
        name: this.newDeviceLabel,
        record: false,
        alerts: false,
        disable: false,
      };

      this.selectedUsers.forEach((user) => {
        const currUser = this.invitedUsers.find(({ email }) => user === email);
        if (currUser) {
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
