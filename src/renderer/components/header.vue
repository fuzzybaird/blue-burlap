<template>
  <b-navbar toggleable="sm" type="dark" variant="info" sticky>
    <b-navbar-nav>
      <b-nav-item to="/">
        Branches
      </b-nav-item>
      <b-nav-item to="/settings">
        Settings
      </b-nav-item>
      <b-nav-item to="#" @click="openOrg()">
        Salesforce
      </b-nav-item>
    </b-navbar-nav>
     
    <b-navbar-nav class="ml-auto">
      <b-nav-text>{{ username }}</b-nav-text>
      <b-button v-if="!loading" @click="sync">
        Sync <!-- <b-badge pill variant="dark">{{ metadataCount }}</b-badge> -->
      </b-button>
      <b-button v-else disabled="disabled">
        Syncing 
        <b-spinner label="Syncing..." small v-if="loading" />
        <b-progress
          variant="warning"
          :max="settings.metadata.length * 10"
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
      username: '',
      settings: {},
      metadataCount: 1,    // default
      timePassed: 0,
      tickInterval: 250    // default
    };
  },
  methods: {
    sync() {
      console.log('Syncing now! ' + this.metadataCount + ' items')
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
    },
    openOrg() {
      ipcRenderer.send('open-org')
    }
  },
  mounted(){
    ipcRenderer.on('sync', (event, payload) => {
      console.log('Done syncing.')
      this.loading = false
      this.timePassed = 0
    })
    ipcRenderer.on('save-settings', (event, payload) => {
      ipcRenderer.send('read-settings')
    })
    ipcRenderer.send('read-settings')
    ipcRenderer.on('read-settings', (event, payload) => {
      this.settings = payload

      if (typeof this.settings.tickInterval != 'undefined') {
        this.tickInterval = this.settings.tickInterval
      }
      if (typeof this.settings.metadata != 'undefined') {
        this.metadataCount = this.settings.metadata.length
      }
      if (typeof this.settings.org != 'undefined') {
        this.username = this.settings.org
      }
    })
  },
}
</script>

<style scoped>
.navbar-text {
  margin-right: 1rem;
}
</style>