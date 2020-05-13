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
  data() {
    return {
      success: '',
      warning: '',
      error: ''
    };
  },
  methods: {
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
