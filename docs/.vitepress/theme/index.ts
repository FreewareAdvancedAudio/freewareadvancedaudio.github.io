import DefaultTheme from 'vitepress/theme'
import AudioVisualizer from '../components/AudioVisualizer.vue'
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
    app.component('AudioVisualizer', AudioVisualizer)
  }
}
