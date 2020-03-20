<template>
  <div class="container">
    <h1>Settings</h1>
    <div class="row">
      <div class="col"><h2>Salesforce Connection</h2></div>
      <div class="col"><h2>Git Repository</h2></div>
    </div>
    <div class="row">
      <div class="col">
          <div class="row">
            <div class="col">Type</div>
            <div class="col">
              <select v-model="settings.orgType">
                <option>Production</option>
                <option>Sandbox</option>
                <option>Scratch Org</option>
              </select>
            </div>
        </div>
      </div>
      <div class="col">
          <div class="row">
            <div class="col">Path</div>
            <div class="col"><b-form-input v-model="settings.path" placeholder="Enter your name"></b-form-input></div>
          </div>
        </div>
    </div>
    <b-button @click="writesettings">Write</b-button>


  </div>

  

</template>

<script>
import { remote } from 'electron'
import { settings } from 'cluster';
const { ipcRenderer } = require('electron')

export default {
  data () {
    return {
      settings: {
        path: '',
        orgType: ''
      }
    }
  },
  methods: {
    writesettings () {
      ipcRenderer.send('write-settings', this.settings)
    }
  },
  mounted(){
      ipcRenderer.send('read-settings')
      ipcRenderer.on('read-settings', (event, payload) => {
          this.settings = payload
      })
  },
}
</script>