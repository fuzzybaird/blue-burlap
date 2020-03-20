<template>
  <b-navbar toggleable="lg" type="dark" variant="info">
    <div class="container">
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
        <b-button v-else disabled="disabled">Syncing...</b-button>
      </b-navbar-nav>
    </div>
  </b-navbar>
</template>

<script>
const { ipcRenderer } = require('electron')
export default {
  name: 'header',
  data() {
    return {
      loading: false
    };
  },
  methods: {
    sync() {
      console.log('Syncing now!')
      ipcRenderer.send('sync', {})
      this.loading = true
    }
  },
  mounted(){
    ipcRenderer.on('sync', (event, payload) => {
      console.log('Done syncing.')
      this.loading = false
    })
  },
}
</script>

