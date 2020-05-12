<template>
  <b-navbar toggleable="sm" type="dark" variant="info" sticky>
    <b-navbar-nav>
      <b-nav-item to="/">
          Branches
      </b-nav-item>
      <b-nav-item to="/settings">
          Settings
      </b-nav-item>
    </b-navbar-nav>
    <b-navbar-nav class="ml-auto">
      <b-button v-if="!loading" @click="sync">Sync</b-button>
      <b-button v-else disabled="disabled">
        Syncing 
        <b-spinner label="Syncing..." small v-if="loading" />
        <b-progress
          variant="warning"
          :max="settings.metadata.length"
          :value="timePassed"
          height="4px"
        ></b-progress>
      </b-button>
    </b-navbar-nav>
  </b-navbar>
</template>
<script>
const { ipcRenderer } = require('electron')
import { settings } from 'cluster'

export default {
  name: 'header',
  data() {
    return {
      loading: false,
      settings: {},
      metadataCount: 0,
      timePassed: 0,
      tickInterval: 2000
    };
  },
  methods: {
    sync() {
      console.log('Syncing now! ' + this.settings.metadata.length + ' items')
      ipcRenderer.send('sync', {})
      this.loading = true
      self = this
      setTimeout(self.tick, self.tickInterval)      
    },
    tick() {
      if (this.loading == false) return;
      this.timePassed += 1
      self = this
      setTimeout(self.tick, self.tickInterval)
    }
  },
  mounted(){
    ipcRenderer.on('sync', (event, payload) => {
      console.log('Done syncing.')
      this.loading = false
      this.timePassed = 0
      //let path = '?success=Sync+completed.'
      //this.$router.push({ path })
    })
    ipcRenderer.send('read-settings')
    ipcRenderer.on('read-settings', (event, payload) => {
      this.settings = payload
    })
  },
}
</script>

