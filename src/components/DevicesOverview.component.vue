<template>
  <v-card>
    <v-card-title>Devices Overview</v-card-title>
    <v-data-table
      :items="deviceItems"
      :headers="headers"
      hide-default-footer
      show-select
      dense
    >
      <template v-slot:[`item.name`]="{ item }">
        <v-edit-dialog v-on:save="updateDeviceName">
          {{ item.name }}
          <template v-slot:input>
            <v-text-field
              :label="item.name"
              :rules="[max20chars]"
              single-line
              clearable
              counter
            ></v-text-field>
          </template>
          <v-icon small class="mr-2"> mdi-pencil</v-icon>
        </v-edit-dialog>
      </template>
      <template v-slot:[`item.alerts`]="{ item }" align="center">
        <div class="d-flex justify-center">
          <v-checkbox v-model="item.alerts"></v-checkbox>
        </div>
      </template>
    </v-data-table>
  </v-card>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import { Device } from "@/model/db-handler";

const headers = [
  { text: "Id", value: "id", width: 195 },
  { text: "Name", value: "name", width: 195 },
  { text: "Readings Today", value: "readings" },
  { text: "Notification", value: "alerts", align: "center" },
];

export default Vue.extend({
  props: {
    devices: Object as PropType<Record<string, Device>>,
    updateName: Function as PropType<
      (device: string, newName: string) => string
    >,
  },
  data() {
    return {
      headers,
      deviceItems: Object.values(this.devices),
    };
  },
  methods: {
    updateDeviceName(event: Event): void {
      console.log(event);
    },
    max20chars(input: string): boolean | string {
      if (input) {
        return input.length < 20 ? true : "Max 20 Characters";
      }
      return true;
    },
  },
});
</script>
