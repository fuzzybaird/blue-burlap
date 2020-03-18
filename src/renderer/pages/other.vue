<template>
  <div class="e-nuxt-container">
    <div class="e-nuxt-content">
      Other fucking page
    </div>
    <div>
      <button @click="test">test</button>
    </div>
    <table>
      <tr v-for="item in output" :key="item.id">
        <td>{{ item.commit }}</td>
      </tr>
    </table>
  </div>
</template>

<script>
import { remote } from 'electron'
const { ipcRenderer } = require('electron')

export default {
  data () {
    return {
      output: []
    }
  },
  mounted () {
    ipcRenderer.on('asynchronous-reply', (event, arg) => {
      const decoded = JSON.parse(arg)
      this.reply(decoded)
    })
  },
  methods: {
    openURL (url) {
      remote.shell.openExternal(url)
    },
    test () {
      ipcRenderer.send('asynchronous-message', 'ping')
    },
    reply (gitresponse) {
      this.output = gitresponse
    }
  }
}
</script>

<style>
.e-nuxt-container {
  min-height: calc(100vh - 50px);
  background: linear-gradient(to right, #ece9e6, #ffffff);
  font-family: Helvetica, sans-serif;
}

.e-nuxt-content {
  display: flex;
  justify-content: space-around;
  padding-top: 100px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.e-nuxt-logo{
  width: 400px;
}

.e-nuxt-system-info {
  padding: 20px;
  border-top: 1px solid #397c6d;
  border-bottom: 1px solid #397c6d;
}

.e-nuxt-links {
  padding: 100px 0;
  display: flex;
  justify-content: center;
}

.e-nuxt-button {
  color: #364758;
  padding: 5px 20px;
  border: 1px solid #397c6d;
  margin: 0 20px;
  border-radius: 15px;
  font-size: 1rem;
}

.e-nuxt-button:hover{
  cursor: pointer;
  color: white;
  background-color: #397c6d;
}
</style>
