<template>
<div class="container">
    <div class="row">
        <div class="col">
            <b-table head-variant="dark" striped hover :items="diff" :fields="fields">
            <template  v-slot:cell(fileDiff)="row">
                <prism class="diff-highlight" language="diff">{{row.item.fileDiff}}</prism>
            </template>
            </b-table>
        </div>
    </div>
</div>
</template>

<script>
    const { ipcRenderer } = require('electron')
    import 'prismjs'
    import 'prismjs/themes/prism-coy.css'
    import 'prismjs/components/prism-diff'
    import 'prismjs/plugins/diff-highlight/prism-diff-highlight.css'
    import Prism from 'vue-prism-component'
    export default {
        name: "BranchDetail",
        components: {Prism},
        data() {
            return {
                fields: [{key:'changes', sortable:true}, {key:'fileDiff'}],
                diff: []
            };
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