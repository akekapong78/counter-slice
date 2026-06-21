import type { Layer } from '@/lib/types'

export function exportCsv(layers: Layer[], sourceFileName: string): void {
  const header = 'Layer Name,Count,Source,Visible\n'
  const rows = layers.map((l) => `"${l.name.replace(/"/g, '""')}",${l.count},${l.source},${l.visible}`).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, sourceFileName.replace(/\.pdf$/i, '') + '-layers.csv')
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
