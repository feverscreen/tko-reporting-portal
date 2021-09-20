<template>
        <v-menu :ref="`menu-${id}`" max-width="450px" :close-on-click="false" offset-y bottom :close-on-content-click="false">
          <template v-slot:activator="{ on, attrs }">
            <v-btn text v-bind="attrs" v-on="on"
              ><v-icon>mdi-email-outline</v-icon></v-btn
            >
          </template>
          <v-card>
            <v-form @submit="sendEmail">
              <v-container>
                <v-row align="center">
                  <v-text-field v-model="mail" class="pl-4" label="E-mail" required></v-text-field>
                  <v-btn class="mx-4" dark color="primary" type="submit">Send</v-btn>
                  <v-btn class="mr-2" text @click="closeMenu()">Cancel</v-btn>
                </v-row>
              </v-container>
            </v-form>
          </v-card>
        </v-menu>
</template>
<script lang="ts">
import Vue from 'vue'
export default Vue.extend({
  props: {
    id: String
  },
  data: function() {
    return {
      mail: ""
    }
  },
  methods: {
    closeMenu(){
      (this.$refs[`menu-${this.id}`] as any).isActive = false;
      this.mail = "";
    },
    sendEmail(event: Event) {
      location.href = `mailto:${this.mail}?subject=Temperature%20Reading%20App&body=${window.location.toString()}qr?code=tko-${this.id}`
      event.preventDefault();
      (this.$refs[`menu-${this.id}`] as any).isActive = false
      this.mail = "";
    }
    }
})
</script>
