/**
 * By default, Nuxt.js is configured to cover most use cases.
 * This default configuration can be overwritten in this file
 * @link {https://nuxtjs.org/guide/configuration/}
 */

module.exports = {
  mode: 'spa', // or 'universal'
  head: {
    title: 'blue-burlap'
  },
  loading: false,
  plugins: [
    { ssr: true, src: '@/plugins/icons.js' },
    { mode: 'client', src: '@/plugins/prism.js' }
  ],
  css: [
    'prismjs/themes/prism-coy.css',
    'prismjs/plugins/diff-highlight/prism-diff-highlight.css'
  ],
  buildModules: [

  ],
  modules: [
    'bootstrap-vue/nuxt',
  ]
}
