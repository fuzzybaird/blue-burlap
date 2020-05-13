<template>
<b-container>
	<b-row>
		<b-col>
			<h1>Current Changes from Org</h1>
			<h3>Branch: {{ currentBranch }}</h3>
		</b-col>
	</b-row>
	<b-row>
		<b-col>
			<b-form-checkbox-group id="selected-files" v-model="commitDetail.selectedFiles" name="selectedFiles">
				<b-table head-variant="light" striped hover :items="diff" :fields="fields">
					<template v-slot:cell(✅)="row">
						<b-form-checkbox size="lg" :value="row.item.path">
						</b-form-checkbox>
					</template>

					<template  v-slot:cell(fileDiff)="row">
						<a href="javascript://" @click="row.item.show = !row.item.show">{{ row.item.path }}</a>
						<div v-if="row.item.show">
							<prism v-if="row.item.fileDiff" class="diff-highlight" language="diff">{{row.item.fileDiff}}</prism>
							<p v-else><strong>New File:</strong> {{row.item.path}}</p>
						</div>
					</template>
				</b-table>
			</b-form-checkbox-group>

			<h5>Commit message (required):</h5>

			<b-form-textarea
				id="textarea"
				v-model="commitDetail.message"
				placeholder="Enter something..."
				rows="3"
				max-rows="6"
				></b-form-textarea>
			<b-button @click="commit">Commit</b-button>
			<b-button>Cancel</b-button>
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
				text: '',
				commitDetail: {
					message: '',
					selectedFiles: []
				}
			};
		},
		methods: {
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
				this.diff = payload
			})
			ipcRenderer.on('sync', (event, payload) => {
				ipcRenderer.send('git-detail', this.currentBranch)
			})
		},
	}
</script>

<style>
@import url('../../../resources/prism.css');
@import url('../../../resources/prism-coy.css');
@import url('../../../resources/prism-diff-highlight.css');
</style>