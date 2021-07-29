<template>
  <v-card>
    <v-card-title class="d-flex align-center justify-space-between">
      Users Overview
      <div>
        <v-dialog
          v-model="newUserDialog"
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
              New User 
              <v-icon class="ml-1 mb-1"> mdi-plus </v-icon>
            </v-btn>
          </template>
          <v-card>
            <v-container>
            <span class="text-h5">Create New User</span>
            <v-row>
            </v-row>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="blue darken-1" text v-on:click="close">
                Cancel
              </v-btn>
              <v-btn color="blue darken-1" text v-on:click="save"> Save </v-btn>
            </v-card-actions>
            </v-container>
          </v-card>
      </v-dialog>
      </div>
    </v-card-title>
  </v-card>
</template>

<script lang="ts">
import Vue, { PropType } from "vue";
import { Device, User } from "@/model/db-handler";

export default Vue.extend({
  data() {
    return {
    newUserDialog: false 
    };
  },
});
</script>
