import type { ExtractedBlock, EquipmentName } from '@/lib/types'

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
  const lines = ['page,poleId,action,code,nameTh,unit']
  for (const block of blocks) {
    for (const item of block.items) {
      const entry = lookup.get(item.code)
      lines.push(row([
        String(block.pageIndex + 1),
        block.poleId ?? '',
        item.action,
        item.code,
        entry?.nameTh ?? '',
        entry?.unit ?? '',
      ]))
    }
  }
  return lines.join('\n')
}

export function exportExtractCsvSummary(
  blocks: ExtractedBlock[],
  names: EquipmentName[]
): string {
  const lookup = nameMap(names)
  const counts = new Map<string, { RM: number; IN: number; RP: number }>()

  for (const block of blocks) {
    for (const item of block.items) {
      if (!counts.has(item.code)) counts.set(item.code, { RM: 0, IN: 0, RP: 0 })
      counts.get(item.code)![item.action]++
    }
  }

  const lines = ['code,nameTh,unit,RM,IN,RP']
  for (const [code, c] of Array.from(counts.entries()).sort()) {
    const entry = lookup.get(code)
    lines.push(row([code, entry?.nameTh ?? '', entry?.unit ?? '', String(c.RM), String(c.IN), String(c.RP)]))
  }
  return lines.join('\n')
}
