<template>
  <b-container>
    <b-row>
      <b-col><h1>Branches</h1></b-col>
    </b-row>
    <b-row>
      <b-col>
        <b-table head-variant="light" striped hover :items="branches" :fields="fields">
          <template v-slot:cell(edit)="row">
            <nuxt-link
              :to="'/branch/'+encodeURIComponent(row.item.name)"
              exact>
              <b-button size="sm" class="mr-2">
                Checkout
              </b-button>
            </nuxt-link>
          </template>
          <template v-slot:table-colgroup="scope">
            <col
            v-for="field in scope.fields"
            :key="field.key"
            :style="{ width: field.key === 'edit' ? '50px' : '' }"
            >
          </template>
        </b-table>
      </b-col>
    </b-row>
    <b-row>
      <b-col><h2>Create New Branch</h2></b-col>
    </b-row>
    <b-row align-v="center">
      <b-col cols="1">Name</b-col>
      <b-col cols="7"><b-input v-model="newBranch" placeholder="new-branch-name"></b-input></b-col>
      <b-col cols="3"><b-button @click="createBranch">Create</b-button></b-col>
    </b-row>
  </b-container>
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
      fields: [{key:'name', sortable:true}, {key:'commit'}, {key:'edit'}],
      branches: [],
      newBranch: ''
    }
  },
  methods: {
    openURL(url) {
      remote.shell.openExternal(url)
    },
    createBranch() {
      ipcRenderer.send('create-branch', { branch: this.newBranch })
    }
  },
  mounted(){
    ipcRenderer.send('git-branches')
    ipcRenderer.on('git-branches', (event, payload) => {
      console.log(payload)
      this.branches = Object.values(payload.branches)
    })
    ipcRenderer.on('create-branch', (event, payload) => {
      ipcRenderer.send('git-branches')
      this.newBranch = ''
    })
  },
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
