import { describe, it, expect, vi } from 'vitest'
import { extractOcgGroups } from './ocg-parser'

function makeMockPdfDoc(groups: Record<string, { name: string }> | null) {
  return {
    getOptionalContentConfig: vi.fn().mockResolvedValue({
      getGroups: vi.fn().mockReturnValue(groups),
    }),
  } as any
}

describe('extractOcgGroups', () => {
  it('returns empty array when PDF has no OCG groups', async () => {
    const doc = makeMockPdfDoc(null)
    const result = await extractOcgGroups(doc)
    expect(result).toEqual([])
  })

  it('extracts OCG group names and refs', async () => {
    const doc = makeMockPdfDoc({
      '10 0 R': { name: 'WALL' },
      '11 0 R': { name: 'DOOR' },
    })
    const result = await extractOcgGroups(doc)
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('WALL')
    expect(result[0].ref).toBe('10 0 R')
    expect(result[1].name).toBe('DOOR')
  })

  it('sets defaultVisible to true', async () => {
    const doc = makeMockPdfDoc({ '10 0 R': { name: 'X' } })
    const result = await extractOcgGroups(doc)
    expect(result[0].defaultVisible).toBe(true)
  })
})
