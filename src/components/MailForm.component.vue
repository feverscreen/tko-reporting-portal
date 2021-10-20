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
      const link = `${window.location.toString()}qr/tko-${this.id}`
      const message = `mailto:${this.mail}?subject=Te%20Kahu%20Ora%20QR%20code&body=Kia%20ora%2C%0D%0A%0D%0A%0D%0AHere%20is%20a%20link%20to%20your%20Te%20Kahu%20Ora%20QR%20code%3A%0D%0A${link}%0D%0A%0D%0AYou%20can%20store%20this%20on%20your%20phone%20and%20show%20it%20after%20you%20have%20had%20your%20temperature%20taken%20by%20a%20Te%20Kahu%20Ora%20camera%20as%20demonstrated%20on%20this%20video%3A%0D%0Ahttps%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D077GlZoMgqg%26t%3D7s%0D%0A%0D%0AInstructions%3A%0D%0A%0D%0AAndroid%0D%0AAfter%20visiting%20the%20website%20on%20your%20phone%2C%20press%20%E2%80%9CAdd%20tko%20to%20Home%20screen%E2%80%9D%20in%20either%20the%20bottom%20of%20the%20screen%20or%20in%20the%20menu%2C%20and%20click%20install.%20The%20app%20will%20be%20ready%20for%20you%20to%20open%20when%20you%20take%20your%20temperature%20by%20simply%20holding%20up%20the%20QR%20code.%0D%0A%0D%0AiPhone%0D%0AAfter%20visiting%20the%20website%20on%20your%20phone%2C%20open%20the%20menu%20to%20press%20%E2%80%9CAdd%20to%20Home%20Screen%E2%80%9D.%20The%20app%20will%20be%20ready%20for%20you%20to%20open%20when%20you%20take%20your%20temperature%20by%20simply%20holding%20up%20the%20QR%20code.%0D%0A%0D%0A%0D%0ANg%C4%81%20mihi%20nui%2C%0D%0ATe%20Kahu%20Ora%20team%0D%0A` 
      location.href = message  
      event.preventDefault();
      (this.$refs[`menu-${this.id}`] as any).isActive = false
      this.mail = "";
    }
    }
})
</script>
