<template>
  <div class="container">
    <b-alert :show="showSuccess()" variant="success">{{ successMessage }}</b-alert>
    <b-alert :show="showWarning()" variant="warning">{{ warningMessage }}</b-alert>
    <b-alert :show="showError()" variant="danger">{{ errorMessage}} </b-alert>
    <div class="row">
      <div class="col"><h1>Branches</h1></div>
    </div>
    <div class="row">
      <div class="col">
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
      </div>
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
      fields: [{key:'name', sortable:true}, {key:'commit'}, {key:'edit'}],
      branches: [],
      successMessage: '',
      warningMessage: '',
      errorMessage: ''
    }
  },
  methods: {
    openURL(url) {
      remote.shell.openExternal(url)
    },
    showSuccess() {
      this.successMessage = this.$route.query.success
      return (this.successMessage)
    },
    showError() {
      this.errorMessage = this.$route.query.error
      return (this.errorMessage)
    },
    showWarning() {
      this.warningMessage = this.$route.query.warning
      return (this.warningMessage)
    }
  },
  mounted(){
    ipcRenderer.send('git-branches')
    ipcRenderer.on('git-branches', (event, payload) => {
      console.log(payload)
      this.branches = Object.values(payload.branches)
    })
  },
}
</script>

<style>
.container {
  margin-top: 1rem;
}

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
