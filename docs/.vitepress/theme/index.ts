import DefaultTheme from 'vitepress/theme'
import WasmConverter from '../components/WasmConverter.vue'
import AudioVisualizer from '../components/AudioVisualizer.vue'
import BenchmarkShowcase from '../components/BenchmarkShowcase.vue'
import Esp32Showcase from '../components/Esp32Showcase.vue'
import BlogList from '../components/BlogList.vue'
import PostDate from '../components/PostDate.vue'
import PostNav from '../components/PostNav.vue'
import './custom.css'

import { h } from 'vue'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-image': () => h(AudioVisualizer),
      'doc-before': () => h(PostDate),
      'doc-after': () => h(PostNav)
    })
  },
  enhanceApp({ app }) {
    app.component('WasmConverter', WasmConverter)
    app.component('AudioVisualizer', AudioVisualizer)
    app.component('BenchmarkShowcase', BenchmarkShowcase)
    app.component('Esp32Showcase', Esp32Showcase)
    app.component('BlogList', BlogList)
  }
}
