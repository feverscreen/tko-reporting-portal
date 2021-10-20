<template>
  <v-card>
    <v-card-title class="d-flex align-center justify-space-between">
      Devices Overview
      <div>
        <v-dialog
          v-if="isSuperAdmin"
          v-model="newItemDialog"
          max-width="600px"
          persistent
        >
          <template v-slot:activator="{ on, attrs }">
            <div>
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
            </div>
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
                    :items="adminUsers"
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
        <v-menu v-if="isSuperAdmin" offset-y class="ml-8">
          <template v-slot:activator="{ on, attrs }">
            <v-btn color="grey lighten-5" v-bind="attrs" v-on="on" class="mr-6">
              Action
              <v-icon class="mb-1"> mdi-menu-down </v-icon>
            </v-btn>
          </template>
          <v-list>
            <v-dialog
              v-if="isSuperAdmin"
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
      :show-select="isSuperAdmin"
      max-height="400"
      fixed-header
      dense
    >
      <template v-if="isSuperAdmin" v-slot:[`item.label`]="{ item }">
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
      <template v-slot:[`item.settings`]="{ item }" align="center">
        <v-dialog max-width="270px" hide-overlay>
          <template v-slot:activator="{ on, attrs }">
            <v-btn text class="my-2 mr-4" v-bind="attrs" v-on="on">
              <v-icon small class="mx-1"> mdi-cog</v-icon>
            </v-btn>
          </template>
          <v-card>
            <v-card-title>
              <span class="text-h5">Device Settings</span>
              <span class="text--secondary">{{ item.label }}</span>
            </v-card-title>
            <v-container class="pt-0">
              <v-col class="pt-0">
                <v-checkbox
                  v-model="item.alerts"
                  v-on:click="updateDeviceAlerts(item.id, item.alerts)"
                  label="Notifications"
                ></v-checkbox>
                <v-checkbox
                  v-model="item.qr"
                  v-on:click="updateDeviceQR(item.id, item.qr)"
                  label="QR Mode"
                ></v-checkbox>
                <v-checkbox
                  v-if="isSuperAdmin"
                  v-model="item.record"
                  v-on:click="updateDeviceRecord(item.id, item.record)"
                  label="Record Activity"
                ></v-checkbox>
              </v-col>
            </v-container>
          </v-card>
        </v-dialog>
      </template>
      <template v-slot:[`item.adminUsers`]="{ item }" align="center">
        <v-menu
          offset-y
          offset-overflow
          absolute
          min-width="400px"
          max-height="400px"
          :close-on-content-click="false"
        >
          <template v-slot:activator="{ on, attrs }">
            <v-btn
              icon
              class="my-2"
              v-bind="attrs"
              v-on="on"
              :disabled="adminUsers.length === 0"
            >
              <v-icon> mdi-format-list-bulleted-square </v-icon>
            </v-btn>
          </template>
          <v-container
            class="list-row-org ma-0 px-0 pb-0 pt-2 white flex-nowrap"
            v-for="org in organizations"
            :key="org"
          >
            <v-row class="flex-nowrap px-8">
            <v-icon
              @click="toggleDeviceForOrg(org, item.id)"
              :color="
                iconOrg(org, item.id) !== 'mdi-checkbox-blank-outline'
                  ? 'blue darken-2'
                  : ''
              "
            >
              {{ iconOrg(org, item.id) }}
            </v-icon>
            <v-list-group class="pr-3 list-item-org" :ripple="false">
              <template v-slot:activator>
                <v-list-item-title min-width="100%">{{
                  org
                }}</v-list-item-title>
              </template>
              <v-list class="overflow-y-auto">
                <v-list-item
                  v-for="user in adminUsers.filter(
                    (val) => val.organization === org
                  )"
                  :key="user.username"
                >
                  <v-checkbox
                    :input-value="userHasDevice(user.devices, item.id)"
                    v-on:click="toggleDeviceForAdmin(item, user)"
                  ></v-checkbox>
                  <v-list-item-title>{{ user.email }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-list-group>
            </v-row>
            <v-divider></v-divider>
          </v-container>
        </v-menu>
      </template>
    </v-data-table>
  </v-card>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import { Device, Admin } from "@/model/db-handler";

export default Vue.extend({
  props: {
    isSuperAdmin: Boolean,
    devices: Array as PropType<Device[]>,
    adminUsers: Array as PropType<Admin[]>,
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
    updateDeviceQR: Function as PropType<
      (device: string, qrMode: boolean) => Promise<void>
    >,
    updateDeviceRecord: Function as PropType<
      (device: string, record: boolean) => Promise<void>
    >,
    toggleDeviceForAdmin: Function as PropType<
      (device: Device, user: Admin) => Promise<void>
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
        { text: "Version", value: "version", width: 165 },
        { text: "Settings", value: "settings", align: "center", width: 125 },
      ];

      if (this.isSuperAdmin) {
        const [salt, admins] = [
          { text: "Salt Id", value: "id", width: 105 },
          { text: "Admins", value: "adminUsers", align: "center" },
        ];
        return [salt, ...headers, admins];
      }
      return headers;
    },
    organizations: {
      get: function (): string[] {
        return [
          ...new Set(
            this.adminUsers
              .map((user) => user.organization ?? "")
              .filter((val) => val)
          ),
        ];
      },
    },
  },
  methods: {
    iconOrg(org: string, device: string) {
      const orgUsers = this.adminUsers.filter(
        (val) => val.organization === org
      );
      const usersWithDevice = orgUsers.filter((user) => this.userHasDevice(user.devices, device));
      if (usersWithDevice.length === orgUsers.length) {
        return "mdi-checkbox-marked";
      } else if (usersWithDevice.length === 0) {
        return "mdi-checkbox-blank-outline";
      } else {
        return "mdi-minus-box";
      }
    },
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
    toggleDeviceForOrg(org: string, deviceId: string) {
      const device = this.devices.find((val) => val.id === deviceId);
      if (device) {
        const orgUsers = this.adminUsers.filter(
          (val) => val.organization === org
        );
        const usersWithoutDevice = orgUsers.filter(
          (user) => !this.userHasDevice(user.devices, deviceId)
        );
        if (usersWithoutDevice.length !== orgUsers.length && usersWithoutDevice.length !== 0) {
          usersWithoutDevice.forEach((user) => {
            const userDevice = user.devices[deviceId]
            this.toggleDeviceForAdmin(device, user);
            if (userDevice) {
              userDevice.disable = false;
            }
          });
        } else {
          orgUsers.forEach(async (user) => {
            const userDevice = user.devices[deviceId]
            this.toggleDeviceForAdmin(device, user);
            if (userDevice) {
              userDevice.disable = true;
            }
          });
        }
      }
    },
    save() {
      const device: Device = {
        id: this.newDeviceId,
        label: this.newDeviceLabel,
        name: this.newDeviceLabel,
        record: false,
        alerts: false,
        qr: false,
        disable: false,
      };

      this.selectedUsers.forEach((user) => {
        const currUser = this.adminUsers.find(({ email }) => user === email);
        if (currUser) {
          this.toggleDeviceForAdmin(device, currUser);
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
<style lang="scss" scoped>
.list-item-org {
  min-width: 100%;
}
</style>
