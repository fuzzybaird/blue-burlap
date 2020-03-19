<template>
<div class="container-fluid">
    <div class="row">
        <div class="col">
            <b-table striped hover :items="diff" :fields="fields">
            <template v-slot:cell(fileDiff)="row">
                <pre>{{row.item.fileDiff}}</pre>
            </template>
            </b-table>
        </div>
    </div>
</div>
</template>

<script>
    const { ipcRenderer } = require('electron')
    export default {
        name: "BranchDetail",
        data() {
            return {diff: []};
        },
        mounted(){
            ipcRenderer.send('git-detail', this.$route.params.id)
            ipcRenderer.on('git-detail', (event, payload) => {
                this.diff = payload
            })
        },
    }
</script>

<style lang="scss" scoped>

</style>