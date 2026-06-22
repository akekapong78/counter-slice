import { describe, it, expect } from 'vitest'
import { exportExtractCsvDetail, exportExtractCsvSummary } from './extract-csv-export'
import type { ExtractedBlock, EquipmentName, ItemCounts } from '@/lib/types'

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
  { code: '12-Y', catalogCode: '1000110001', nameEn: 'POLE,CONCRETE 12M', nameTh: 'เสาคอนกรีต 12 เมตร', unit: 'ต้น' },
]

describe('exportExtractCsvDetail', () => {
  it('includes header row with catalogCode and nameEn', () => {
    const csv = exportExtractCsvDetail([block], names)
    expect(csv.split('\n')[0]).toBe('page,poleId,action,code,catalogCode,nameEn,nameTh,unit')
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

  it('includes catalogCode and nameEn from lookup', () => {
    const csv = exportExtractCsvDetail([block], names)
    expect(csv).toContain('1000110001')
    expect(csv).toContain('POLE,CONCRETE 12M')
  })

  it('uses nameTh from lookup when available', () => {
    const csv = exportExtractCsvDetail([block], names)
    expect(csv).toContain('เสาคอนกรีต 12 เมตร')
  })

  it('leaves catalogCode/nameEn empty when not in lookup', () => {
    const csv = exportExtractCsvDetail([block], [])
    expect(csv).toContain('12-Y,,,,')
  })

  it('escapes double quotes in nameEn', () => {
    const csv = exportExtractCsvDetail([block], [
      { code: '12-Y', nameEn: 'say "hello"', nameTh: 'เสา', unit: 'ต้น' }
    ])
    expect(csv).toContain('"say ""hello"""')
  })
})

describe('exportExtractCsvSummary', () => {
  it('includes catalogCode and nameEn in summary CSV', () => {
    const counts: Record<string, ItemCounts> = {
      'ST-COM': { IN: 3, RM: 1, RP: 0 },
      'CCB':    { IN: 5, RM: 0, RP: 0 },
    }
    const summaryNames: EquipmentName[] = [
      { code: 'ST-COM', catalogCode: '1000110002', nameEn: 'CROSSARM,PRESTRESSED CONCRETE', nameTh: 'คอนคอนกรีต', unit: 'ชิ้น' },
    ]
    const csv = exportExtractCsvSummary(counts, summaryNames)
    expect(csv).toContain('catalogCode')
    expect(csv).toContain('1000110002')
    expect(csv).toContain('CROSSARM,PRESTRESSED CONCRETE')
    expect(csv).toContain('3')  // IN count for ST-COM
  })

  it('header includes all expected columns', () => {
    const csv = exportExtractCsvSummary({}, [])
    expect(csv.split('\n')[0]).toBe('code,catalogCode,nameEn,nameTh,unit,RM,IN,RP')
  })

  it('sorts entries by code', () => {
    const counts: Record<string, ItemCounts> = {
      'ZZZ': { IN: 1, RM: 0, RP: 0 },
      'AAA': { IN: 0, RM: 1, RP: 0 },
    }
    const csv = exportExtractCsvSummary(counts, [])
    const rows = csv.split('\n')
    expect(rows[1]).toMatch(/^AAA/)
    expect(rows[2]).toMatch(/^ZZZ/)
  })
})
