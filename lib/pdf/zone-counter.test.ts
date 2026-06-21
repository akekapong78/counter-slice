import { describe, it, expect, vi } from 'vitest'
import { countObjectsInZone } from './zone-counter'
import type { Rect } from '@/lib/types'

const OPS_MOVE_TO = 13
const OPS_STROKE = 19
const OPS_FILL = 20

function makeMockPage(fnArray: number[], argsArray: any[][], width = 100, height = 100) {
  return {
    getOperatorList: vi.fn().mockResolvedValue({ fnArray, argsArray }),
    getViewport: vi.fn().mockReturnValue({ width, height }),
  } as any
}

describe('countObjectsInZone', () => {
  it('returns 0 when no path operators', async () => {
    const page = makeMockPage([], [])
    const zone: Rect = { x: 0, y: 0, width: 1, height: 1 }
    expect(await countObjectsInZone(page, zone)).toBe(0)
  })

  it('counts stroke inside zone covering full page', async () => {
    const page = makeMockPage([OPS_MOVE_TO, OPS_STROKE], [[50, 50], []])
    const zone: Rect = { x: 0, y: 0, width: 1, height: 1 }
    expect(await countObjectsInZone(page, zone)).toBe(1)
  })

  it('does not count stroke outside zone', async () => {
    // moveTo(80,80) is in bottom-right, zone covers top-left
    const page = makeMockPage([OPS_MOVE_TO, OPS_STROKE], [[80, 80], []])
    const zone: Rect = { x: 0, y: 0, width: 0.4, height: 0.4 }
    expect(await countObjectsInZone(page, zone)).toBe(0)
  })

  it('counts multiple paint ops within zone', async () => {
    const page = makeMockPage(
      [OPS_MOVE_TO, OPS_STROKE, OPS_MOVE_TO, OPS_FILL],
      [[10, 10], [], [20, 20], []]
    )
    const zone: Rect = { x: 0, y: 0, width: 1, height: 1 }
    expect(await countObjectsInZone(page, zone)).toBe(2)
  })
})
