<template>
  <div class="e-nuxt-container">
    <div class="e-nuxt-content">
      <h1>home</h1>
      <p>{{count}}</p>
    </div>
  </div>
</template>

<script>
import { remote } from 'electron'
import SystemInformation from '~/components/SystemInformation.vue'
const { ipcRenderer } = require('electron')
export default {
  components: {
    SystemInformation
  },
  data () {
    return {
      count: 1
    }
  },
  methods: {
    openURL (url) {
      remote.shell.openExternal(url)
    }
  },
  mounted(){
    ipcRenderer.on('tick_time', (event, arg) => {
      this.count = this.count + 1
    })
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
