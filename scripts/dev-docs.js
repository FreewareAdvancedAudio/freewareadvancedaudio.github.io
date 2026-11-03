import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'

const root = process.cwd()
const generator = path.join(root, 'scripts/generate-cli-docs.js')
const vitepress = path.join(root, 'node_modules/vitepress/bin/vitepress.js')
const upstreamDocs = [
  ...['faac', 'faad', 'faam', 'faar'].map(name => `vendor/faac/docs/${name}.1`),
  ...['libfaac', 'libfaad', 'libfaam', 'libfaar'].map(name => `vendor/faac/docs/${name}.md`)
].map(file => path.join(root, file))

function generateReferences() {
  const result = spawnSync(process.execPath, [generator], { cwd: root, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`Reference generation failed with status ${result.status}`)
}

generateReferences()

const server = spawn(process.execPath, [vitepress, 'dev', 'docs', ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
  env: process.env
})

let refreshTimer
let shuttingDown = false

function regenerate() {
  clearTimeout(refreshTimer)
  refreshTimer = setTimeout(() => {
    try {
      generateReferences()
      console.log('Updated generated references from vendor/faac/docs')
    } catch (error) {
      console.error(error)
    }
  }, 150)
}

for (const file of upstreamDocs) {
  fs.watchFile(file, { interval: 500, persistent: true }, (current, previous) => {
    if (current.mtimeMs !== previous.mtimeMs || current.size !== previous.size) regenerate()
  })
}

function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  clearTimeout(refreshTimer)
  for (const file of upstreamDocs) fs.unwatchFile(file)
  if (server.exitCode === null) server.kill(signal)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

server.on('error', error => {
  console.error(error)
  process.exitCode = 1
})

server.on('exit', (code, signal) => {
  for (const file of upstreamDocs) fs.unwatchFile(file)
  if (code !== null) process.exitCode = code
  else if (signal) process.exitCode = 1
})
