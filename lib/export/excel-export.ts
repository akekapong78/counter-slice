import type { Layer } from '@/lib/types'

export async function exportExcel(layers: Layer[], sourceFileName: string): Promise<void> {
  const XLSX = await import('xlsx')
  const rows = layers.map((l) => ({
    'Layer Name': l.name,
    'Count': l.count,
    'Source': l.source,
    'Visible': l.visible ? 'Yes' : 'No',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Layers')
  XLSX.writeFile(wb, sourceFileName.replace(/\.pdf$/i, '') + '-layers.xlsx')
}
