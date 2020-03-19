<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-3">
        <b-form-checkbox
      id="checkbox-1"
      v-model="status1"
      name="checkbox-1"
      value="accepted"
      unchecked-value="not_accepted"
    >
      Object/Contact
    </b-form-checkbox>
      </div>
      <div class="col-6">
        <div class="diff-preview">bunch of xml</div>
      </div>
    </div>
    <div class="row">
      <div class="col-3">
        <b-form-checkbox
      id="checkbox-2"
      v-model="status2"
      name="checkbox-1"
      value="accepted"
      unchecked-value="not_accepted"
    >
      Object/Contact
    </b-form-checkbox>
      </div>
      <div class="col-6">
        <div class="diff-preview">bunch of xml</div>
      </div>
    </div>

{{output}}

  </div>
</template>

<script>
import { remote } from 'electron'
import moment from 'moment'
const { ipcRenderer } = require('electron')

export default {
  data () {
    return {
      output: []
    }
  },
  mounted () {
    ipcRenderer.send('git-log')
    ipcRenderer.on('git-log', (event, arg) => {
      this.reply(arg)
    })
  },
  methods: {
    openURL (url) {
      remote.shell.openExternal(url)
    },
    reply (gitresponse) {
      this.output = gitresponse.all
    }
  }
}
</script>

<style language="scss">

</style>
