<template>
<b-container>
	<b-row>
		<b-col>
			<h1>Branch: {{ currentBranch }}</h1>
		</b-col>
	</b-row>
	<b-row>
		<b-col>
			<h3>Status <b-button @click="refresh">Refresh</b-button></h3>
		</b-col>
	</b-row>
	<b-row>
		<b-table-simple>
			<b-thead>
				<b-th>Behind</b-th>
				<b-th>Ahead</b-th>
				<b-th>Tracking</b-th>
			</b-thead>
			<b-tr>
				<b-td>{{ status.behind }}</b-td>
				<b-td>{{ status.ahead }}</b-td>
				<b-td>{{ status.tracking }}</b-td>
			</b-tr>
			<b-tr v-if="status.behind || status.ahead || !status.tracking">
				<b-td>
					<b-button v-if="status.behind" @click="gitPull">
						Pull
						<b-spinner v-if="isPulling" small></b-spinner>
					</b-button>
				</b-td>
				<b-td>
					<b-button v-if="!status.behind && (status.ahead || !status.tracking)" @click="gitPush">
						Push 
						<b-spinner v-if="isPushing" small></b-spinner>
					</b-button>
				</b-td>
				<b-td>&nbsp;</b-td>
			</b-tr>
		</b-table-simple>
	</b-row>
	<b-row>
		<b-col>
			<h3>Current Changes</h3>
			<b-form-checkbox-group id="selected-files" v-model="commitDetail.selectedFiles" name="selectedFiles">
				<b-table head-variant="light" striped hover :items="diff" :fields="fields" :busy="loadingDetail" show-empty empty-text="There are no local changes">
					<template v-slot:cell(✅)="row">
						<b-form-checkbox size="lg" :value="row.item.path">
						</b-form-checkbox>
					</template>

					<template  v-slot:cell(fileDiff)="row">
						<a href="javascript://" @click="row.item.show = !row.item.show">{{ row.item.path }}</a>
						<div v-if="row.item.show">
							<prism v-if="row.item.fileDiff" class="diff-highlight" language="diff">{{row.item.fileDiff}}</prism>
							<p v-else-if="row.item.working_dir=='?'"><strong>New File:</strong> {{row.item.path}}</p>
							<p v-else>(no diff available)</p>
						</div>
					</template>

					<template v-slot:table-busy>
            <div class="text-center my-2">
              <b-spinner class="align-middle"></b-spinner>
              <strong>Loading...</strong>
            </div>
          </template>
				</b-table>
			</b-form-checkbox-group>
		</b-col>
	</b-row>
	<b-row v-if="diff.length">
		<b-col>
			<h5>Commit message (required):</h5>

			<b-form-textarea
				id="textarea"
				v-model="commitDetail.message"
				placeholder="Enter something..."
				rows="3"
				max-rows="6"
				></b-form-textarea>
			<b-button @click="commit">Commit</b-button>
		</b-col>
	</b-row>
	<b-row>
		<b-col>
		</b-col>
	</b-row>
</b-container>
</template>

<script>
	const { ipcRenderer } = require('electron')
	import "prismjs";
	import 'prismjs/components/prism-diff.min'
	import 'prismjs/plugins/diff-highlight/prism-diff-highlight'

	import Prism from "vue-prism-component";
	export default {
		name: "BranchDetail",
		components: {Prism},
		data() {
			return {
				currentBranch: this.$route.params.id,
				fields: ['✅', {key:'fileDiff'}],
				diff: [],
				status: {},
				text: '',
				commitDetail: {
					message: '',
					selectedFiles: []
				},
				isPulling: false,
				isPushing: false,
				loadingDetail: true				
			};
		},
		methods: {
			refresh() {
				ipcRenderer.send('git-detail', this.currentBranch)
				this.loadingDetail = true
			},
			gitPull () {
				ipcRenderer.send('git-pull', { branchName: this.currentBranch })
				this.isPulling = true
			},
			gitPush () {
				ipcRenderer.send('git-push', { branchName: this.currentBranch })
				this.isPushing = true
			},
			commit () {
				ipcRenderer.send('commit', this.commitDetail)
				ipcRenderer.on('commit', (event, payload) => {
					this.commitDetail.message = ''
					ipcRenderer.send('git-detail', this.currentBranch)
				})
			}
		},
		mounted(){
			ipcRenderer.send('git-detail', this.currentBranch)
			ipcRenderer.on('git-detail', (event, payload) => {
				if (payload.error) {
					this.$router.push({ path: '/' })   
					return
				}
				this.loadingDetail = false
				this.diff = payload.diff
				this.status = payload.status
			})
			ipcRenderer.on('sync', (event, payload) => {
				ipcRenderer.send('git-detail', this.currentBranch)
				this.loadingDetail = true
			})
			ipcRenderer.on('git-pull', (event, payload) => {
				this.isPulling = false
				this.loadingDetail = true
				ipcRenderer.send('git-detail', this.currentBranch)
			})
			ipcRenderer.on('git-push', (event, payload) => {
				this.isPushing = false
				this.loadingDetail = true
				ipcRenderer.send('git-detail', this.currentBranch)
			})
		},
	}
</script>

<style>
@import url('../../../resources/prism.css');
@import url('../../../resources/prism-coy.css');
@import url('../../../resources/prism-diff-highlight.css');
.row {
	margin: 0.5rem;
}
</style>