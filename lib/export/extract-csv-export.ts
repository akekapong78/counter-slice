import type { ExtractedBlock, EquipmentName, ItemCounts } from '@/lib/types'

function escapeCell(val: string): string {
  if (val.includes('"') || val.includes(',') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"'
  }
  return val
}

function row(cells: string[]): string {
  return cells.map(escapeCell).join(',')
}

function nameMap(names: EquipmentName[]): Map<string, EquipmentName> {
  return new Map(names.map((n) => [n.code, n]))
}

export function exportExtractCsvDetail(
  blocks: ExtractedBlock[],
  names: EquipmentName[]
): string {
  const lookup = nameMap(names)
  const lines = ['page,poleId,action,code,catalogCode,nameEn,nameTh,unit']
  for (const block of blocks) {
    for (const item of block.items) {
      const entry = lookup.get(item.code)
      lines.push(row([
        String(block.pageIndex + 1),
        block.poleId ?? '',
        block.action,
        item.code,
        entry?.catalogCode ?? '',
        entry?.nameEn ?? '',
        entry?.nameTh ?? '',
        entry?.unit ?? '',
      ]))
    }
  }
  return lines.join('\n')
}

export function exportExtractCsvSummary(
  counts: Record<string, ItemCounts>,
  names: EquipmentName[]
): string {
  const lookup = nameMap(names)
  const lines = ['code,catalogCode,nameEn,nameTh,unit,RM,IN,RP']
  for (const [code, c] of Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))) {
    const entry = lookup.get(code)
    lines.push(row([
      code,
      entry?.catalogCode ?? '',
      entry?.nameEn ?? '',
      entry?.nameTh ?? '',
      entry?.unit ?? '',
      String(c.RM),
      String(c.IN),
      String(c.RP),
    ]))
  }
  return lines.join('\n')
}
