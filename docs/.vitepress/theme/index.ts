import DefaultTheme from 'vitepress/theme'
import WasmConverter from '../components/WasmConverter.vue'
import AudioVisualizer from '../components/AudioVisualizer.vue'
import BenchmarkShowcase from '../components/BenchmarkShowcase.vue'
import './custom.css'

import { h } from 'vue'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-image': () => h(AudioVisualizer)
    })
  },
  enhanceApp({ app }) {
    app.component('WasmConverter', WasmConverter)
    app.component('AudioVisualizer', AudioVisualizer)
    app.component('BenchmarkShowcase', BenchmarkShowcase)
  }
}
