<template>
  <b-container>
    <b-alert :show="success.timer || success.message != ''" variant="success" dismissible fade @dismissed="success.message='';success.timer=0" @dismiss-count-down="successCountDown">
      {{ success.message }}
      <b-progress variant="success" v-if="success.timer" :max="success.timerLength" :value="success.timer" height="1px"></b-progress>
    </b-alert>
    <b-alert :show="warning.timer || warning.message != ''" variant="warning" dismissible fade @dismissed="warning.message='';warning.timer=0" @dismiss-count-down="warningCountDown">
      {{ warning.message }}
      <b-progress variant="warning" v-if="warning.timer" :max="warning.timerLength" :value="warning.timer" height="1px"></b-progress>
    </b-alert>
    <b-alert :show="error.timer || error.message != ''" variant="danger" dismissible fade @dismissed="error.message='';error.timer=0" @dismiss-count-down="errorCountDown">
      {{ error.message }}
      <b-progress variant="danger" v-if="error.timer" :max="error.timerLength" :value="error.timer" height="1px"></b-progress>
    </b-alert>    
  </b-container>
</template>
<script>
const { ipcRenderer } = require('electron')
export default {
  name: 'messages',
  data() {
    return {
      success: {
        timer: 0,
        timerLength: 0,
        message: ''
      },
      warning: {
        timer: 0,
        timerLength: 0,
        message: ''
      },
      error: {
        timer: 0,
        timerLength: 0,
        message: ''
      }
    };
  },
  methods: {
    successCountDown(timer) { this.success.timer = timer },
    warningCountDown(timer) { this.warning.timer = timer },
    errorCountDown(timer) { this.error.timer = timer }
  },
  mounted(){
    ipcRenderer.on('message', (event, payload) => {
      this[payload.type].message = payload.message
      let timer = (typeof payload.timer != 'undefined' && payload.timer > 0) ? payload.timer : 0
      this[payload.type].timerLength = timer
      this[payload.type].timer = timer
    })
  },
}
</script>
<style>
.container {
  margin-top:1rem;
}
</style>
