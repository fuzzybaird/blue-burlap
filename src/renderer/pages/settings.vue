<template>
  <div class="container-fluid">
    <h1>Settings</h1>
    <div class="row">
      <div class="col"><h2>Salesforce Connection</h2></div>
      <div class="col"><h2>Git Repository</h2></div>
    </div>
    <div class="row">
      <div class="col">
        <div class="container-fluid">
          <div class="row">
            <div class="col">Type</div>
            <div class="col">
              <select>
                <option>Production</option>
                <option>Sandbox</option>
                <option>Scratch Org</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      <div class="col">
        <div class="container-fluid">
          <div class="row">
            <div class="col">Path</div>
            <!-- https://jaketrent.com/post/select-directory-in-electron/ -->
            <div class="col"><input type="file" webkitdirectory id="git_path" /></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

