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
            <div class="col">Org</div>
            <div class="col">
              <select v-model="settings.org">
                <option v-for="org in options.orgs" v-bind:key="org.orgId" v-bind:value="org.alias ? org.alias : org.username">
                  {{org.alias}} {{org.username}}
                </option>
              </select>
            </div>
        </div>
      </div>
      <div class="col">
          <div class="row">
            <div class="col">Path</div>
            <div class="col"><b-form-input v-model="settings.path" placeholder="path to source project"></b-form-input></div>
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
      options: {
        orgs: [
          { orgId: '', username: '' }
        ]
      },
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
    ipcRenderer.send('read-options')
    ipcRenderer.on('read-options', (event, payload) => {
      console.log('read-options payload: ', payload)
      this.options = payload
    })
    ipcRenderer.send('read-settings')
    ipcRenderer.on('read-settings', (event, payload) => {
      this.settings = payload
    })
  },
}
</script>