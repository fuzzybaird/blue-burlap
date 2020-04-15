<template>
  <b-container>
    <h1>Settings</h1>
    <b-row>
      <b-col><h2>Salesforce Connection</h2></b-col>
      <b-col><h2>Git Repository</h2></b-col>
    </b-row>
    <b-row>
      <b-col>
        <b-row align-v="center">
          <b-col cols="3">Org</b-col>
          <b-col cols="9">
            <b-form-select v-model="settings.org">
              <option v-for="org in options.orgs" v-bind:key="org.orgId" v-bind:value="org.alias ? org.alias : org.username">
                {{org.alias}} {{org.username}}
              </option>
            </b-form-select>
          </b-col>
        </b-row>
        <b-row align-v="center">
          <b-col cols="3">Metadata</b-col>
          <b-col cols="9">
            <b-form-select v-model="settings.metadata" :options="options.metadata" multiple :select-size="5"></b-form-select>
          </b-col>
        </b-row>
      </b-col>
      <b-col>
        <b-row align-v="center">
          <b-col cols="2">Path</b-col>
          <b-col cols="10"><b-form-input v-model="settings.path" placeholder="path to source project"></b-form-input></b-col>
        </b-row>
      </b-col>
    </b-row>
    <b-row align-h="end">
      <b-col cols="1">
        <b-button @click="saveSettings">Save</b-button>
      </b-col>
    </b-row>

  </b-container>

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
        ],
        metadata: [
          { name: '' }
        ]
      },
      settings: {
        path: '',
        orgType: '',
        metadata: []
      }
    }
  },
  methods: {
    saveSettings () {
      ipcRenderer.send('save-settings', this.settings)
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