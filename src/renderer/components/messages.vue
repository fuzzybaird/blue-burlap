<template>
  <b-container>
    <b-alert :show="success!=''" variant="success" dismissible fade @dismissed="success=''">{{ success }}</b-alert>
    <b-alert :show="warning!=''" variant="warning" dismissible fade @dismissed="warning=''">{{ warning }}</b-alert>
    <b-alert :show="error!=''" variant="danger" dismissible fade @dismissed="error=''">{{ error}} </b-alert>    
  </b-container>
</template>
<script>
const { ipcRenderer } = require('electron')
export default {
  name: 'messages',
  // props: {
  //   success: {
  //     required: true,
      
  //   }
  // },
  data() {
    return {
      success: '',
      warning: '',
      error: ''
    };
  },
  methods: {
    // showSuccess() {
    //   this.success = this.$route.query.success
    //   return (this.success)
    // },
    // showError() {
    //   this.error = this.$route.query.error
    //   return (this.error)
    // },
    // showWarning() {
    //   this.warning = this.$route.query.warning
    //   return (this.warning)
    // }
  },
  mounted(){
    ipcRenderer.on('message', (event, payload) => {
      this[payload.type] = payload.message
    })
  },
}
</script>
<style>
.container {
  margin-top:1rem;
}
</style>
