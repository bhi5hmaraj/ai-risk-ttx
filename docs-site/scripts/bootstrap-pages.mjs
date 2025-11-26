#!/usr/bin/env node
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const docsSiteDir = path.resolve(__dirname, '..')
const pagesDir = path.join(docsSiteDir, 'pages')
const sourceDir = path.resolve(docsSiteDir, '..', 'docs')

async function exists(p) {
  try { await fs.lstat(p); return true } catch { return false }
}

async function removeDir(p) {
  try { await fs.rm(p, { recursive: true, force: true }) } catch {}
}

async function copyDir(src, dst) {
  // Node 18+: fs.cp
  await fs.cp(src, dst, { recursive: true })
}

async function bootstrap() {
  const haveSource = await exists(sourceDir)
  if (!haveSource) {
    console.error(`[bootstrap-pages] Source docs dir not found: ${sourceDir}`)
    return
  }

  // If pages is a symlink to the right place, keep it
  try {
    const st = await fs.lstat(pagesDir)
    if (st.isSymbolicLink()) {
      const target = await fs.readlink(pagesDir)
      if (path.resolve(path.dirname(pagesDir), target) === sourceDir) {
        console.log('[bootstrap-pages] Using existing pages → docs symlink')
        return
      }
    }
    // Otherwise remove whatever is there
    await removeDir(pagesDir)
  } catch {
    // pagesDir missing — ok
  }

  // Try to create a symlink (junction on Windows)
  try {
    const type = process.platform === 'win32' ? 'junction' : 'dir'
    await fs.symlink(sourceDir, pagesDir, type)
    console.log('[bootstrap-pages] Created symlink pages → docs')
    return
  } catch (e) {
    console.warn('[bootstrap-pages] Symlink failed; falling back to copy:', e?.message || e)
  }

  // Fallback: copy
  try {
    await copyDir(sourceDir, pagesDir)
    console.log('[bootstrap-pages] Copied docs into pages/')
  } catch (e) {
    console.error('[bootstrap-pages] Failed to copy docs into pages:', e?.message || e)
  }
}

bootstrap()

