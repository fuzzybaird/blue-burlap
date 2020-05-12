<template>
  <div>
    <app-header />
    <app-messages />
    <nuxt />
  </div>
</template>

<script>
import appHeader from '@/components/header'
import appMessages from '@/components/messages'
const { ipcRenderer } = require('electron')
export default {
  components: { appHeader, appMessages },
  mounted() {

  }
}
</script>

<style>
body {
  margin: 0 !important;
}
</style>
