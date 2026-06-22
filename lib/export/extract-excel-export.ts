import * as XLSX from 'xlsx'
import type { ExtractedBlock, EquipmentName, ItemCounts } from '@/lib/types'
import { exportExtractCsvDetail, exportExtractCsvSummary } from './extract-csv-export'

function csvToSheet(csv: string): XLSX.WorkSheet {
  const rows = csv.split('\n').map((line) =>
    line.split(',').map((cell) => cell.replace(/^"|"$/g, '').replace(/""/g, '"'))
  )
  return XLSX.utils.aoa_to_sheet(rows)
}

export function exportExtractExcel(
  blocks: ExtractedBlock[],
  names: EquipmentName[],
  counts: Record<string, ItemCounts>,
  fileName: string
): void {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, csvToSheet(exportExtractCsvDetail(blocks, names)), 'Detail')
  XLSX.utils.book_append_sheet(wb, csvToSheet(exportExtractCsvSummary(counts, names)), 'Summary')
  XLSX.writeFile(wb, `${fileName}-extract.xlsx`)
}
