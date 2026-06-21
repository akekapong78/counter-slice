import { describe, it, expect } from 'vitest'
import { exportExtractCsvDetail, exportExtractCsvSummary } from './extract-csv-export'
import type { ExtractedBlock, EquipmentName } from '@/lib/types'

const block: ExtractedBlock = {
  id: 'b1', poleId: 'P351', pageIndex: 0,
  bbox: { x: 0.1, y: 0.2, width: 0.05, height: 0.03 },
  color: [255, 0, 0], action: 'RM',
  items: [
    { code: '12-Y', action: 'RM' },
    { code: 'OHGW', action: 'RM' },
  ],
}

const names: EquipmentName[] = [
  { code: '12-Y', nameTh: 'เสาคอนกรีต 12 เมตร', unit: 'ต้น' },
]

describe('exportExtractCsvDetail', () => {
  it('includes header row', () => {
    const csv = exportExtractCsvDetail([block], names)
    expect(csv.split('\n')[0]).toBe('page,poleId,action,code,nameTh,unit')
  })

  it('includes one row per item', () => {
    const csv = exportExtractCsvDetail([block], names)
    const rows = csv.trim().split('\n')
    expect(rows).toHaveLength(3) // header + 2 items
  })

  it('page number is 1-indexed', () => {
    const csv = exportExtractCsvDetail([block], names)
    expect(csv).toContain('1,P351')
  })

  it('uses nameTh from lookup when available', () => {
    const csv = exportExtractCsvDetail([block], names)
    expect(csv).toContain('เสาคอนกรีต 12 เมตร')
  })

  it('leaves nameTh empty when not in lookup', () => {
    const csv = exportExtractCsvDetail([block], [])
    expect(csv).toContain('12-Y,,')
  })

  it('escapes double quotes in nameTh', () => {
    const csv = exportExtractCsvDetail([block], [
      { code: '12-Y', nameTh: 'say "hello"', unit: 'ต้น' }
    ])
    expect(csv).toContain('"say ""hello"""')
  })
})

describe('exportExtractCsvSummary', () => {
  it('includes header row', () => {
    const csv = exportExtractCsvSummary([block], names)
    expect(csv.split('\n')[0]).toBe('code,nameTh,unit,RM,IN,RP')
  })

  it('aggregates counts per code', () => {
    const csv = exportExtractCsvSummary([block], names)
    const row12Y = csv.split('\n').find((r) => r.startsWith('12-Y'))!
    expect(row12Y).toContain('1')
  })
})
