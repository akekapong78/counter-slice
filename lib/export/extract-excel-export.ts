import * as XLSX from 'xlsx'
import type { ExtractedBlock, EquipmentName, ItemCounts } from '@/lib/types'
import { exportExtractCsvDetail } from './extract-csv-export'

function csvToSheet(csv: string): XLSX.WorkSheet {
  const rows = csv.split('\n').map((line) =>
    line.split(',').map((cell) => cell.replace(/^"|"$/g, '').replace(/""/g, '"'))
  )
  return XLSX.utils.aoa_to_sheet(rows)
}

function buildSummaryRows(
  counts: Record<string, ItemCounts>,
  names: EquipmentName[]
): string[][] {
  const lookup = new Map(names.map((n) => [n.code, n]))
  const header = ['code', 'catalogCode', 'nameEn', 'nameTh', 'unit', 'RM', 'IN', 'RP']
  const rows = Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([code, c]) => {
      const entry = lookup.get(code)
      return [
        code,
        entry?.catalogCode ?? '',
        entry?.nameEn ?? '',
        entry?.nameTh ?? '',
        entry?.unit ?? '',
        String(c.RM),
        String(c.IN),
        String(c.RP),
      ]
    })
  return [header, ...rows]
}

export function exportExtractExcel(
  blocks: ExtractedBlock[],
  names: EquipmentName[],
  counts: Record<string, ItemCounts>,
  fileName: string
): void {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, csvToSheet(exportExtractCsvDetail(blocks, names)), 'Detail')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(buildSummaryRows(counts, names)), 'Summary')
  XLSX.writeFile(wb, `${fileName}-extract.xlsx`)
}
