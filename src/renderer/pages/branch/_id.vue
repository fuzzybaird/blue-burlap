<template>
    <div>
        {{$route.params.id}}

        <code>{{ diff }}</code>

    </div>
</template>

<script>
    const { ipcRenderer } = require('electron')
    export default {
        name: "BranchDetail",
        data() {
            return {diff: ''};
        },
        mounted(){
            ipcRenderer.send('git-detail', this.$route.params.id)
            ipcRenderer.on('git-detail', (event, payload) => {
                console.log('git detail mofos')
                console.log(payload)
                this.diff = payload
            })
        },
    }
</script>

<style lang="scss" scoped>

</style>