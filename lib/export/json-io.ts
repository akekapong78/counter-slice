import type { Layer } from '@/lib/types'

type SerializableProject = {
  fileName: string
  pageCount: number
  layers: Layer[]
}

export function exportProjectJson(state: SerializableProject): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  triggerDownload(blob, `counter-slice-${state.fileName}.json`)
}

export async function importProjectJson(file: File): Promise<SerializableProject> {
  const text = await file.text()
  const data = JSON.parse(text) as SerializableProject
  if (!Array.isArray(data.layers)) throw new Error('Invalid project file: missing layers')
  return data
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
