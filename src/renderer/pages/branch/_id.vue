<template>
<div class="container">
    <div class="row">
        <div class="col">
        <h1>Current Diffs in Org</h1>
        </div>
    </div>
    <div class="row">
        <div class="col">
            <b-table head-variant="light" striped hover :items="diff" :fields="fields">
            <template v-slot:cell(checkbox)="row">
                <b-form-checkbox name="checkbox" value="true">
    </b-form-checkbox>
            </template>

            <template  v-slot:cell(fileDiff)="row">
                <prism class="diff-highlight" language="diff">{{row.item.fileDiff}}</prism>
            </template>
            </b-table>

            <h5>Commit message (required):</h5>

            <b-form-textarea
                id="textarea"
                v-model="text"
                placeholder="Enter something..."
                rows="3"
                max-rows="6"
                ></b-form-textarea>
                    </div>
                </div>
                <div class="row">
                    <div class="col my-2">
            <b-button>Commit</b-button>
            <b-button>Cancel</b-button>
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
                fields: ['checkbox',{key:'changes', sortable:false}, {key:'fileDiff'}],
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