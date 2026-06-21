import { describe, it, expect, vi } from 'vitest'
import { countObjectsPerPage } from './object-counter'

const OPS = {
  beginMarkedContentProps: 72,
  endMarkedContent: 73,
  stroke: 19,
  fill: 20,
  paintImageXObject: 85,
  showText: 43,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeMockPage(fnArray: number[], argsArray: any[][]) {
  return {
    getOperatorList: vi.fn().mockResolvedValue({ fnArray, argsArray }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

describe('countObjectsPerPage', () => {
  it('returns zero for all refs when no marked content', async () => {
    const page = makeMockPage([OPS.stroke, OPS.fill], [[], []])
    const result = await countObjectsPerPage(page, ['10 0 R', '11 0 R'])
    expect(result['10 0 R']).toBe(0)
    expect(result['11 0 R']).toBe(0)
  })

  it('counts paint operators inside OCG marked content', async () => {
    const fnArray = [OPS.beginMarkedContentProps, OPS.stroke, OPS.fill, OPS.endMarkedContent]
    const argsArray = [['/OC', { '10 0 R': true }], [], [], []]
    const page = makeMockPage(fnArray, argsArray)
    const result = await countObjectsPerPage(page, ['10 0 R', '11 0 R'])
    expect(result['10 0 R']).toBe(2)
    expect(result['11 0 R']).toBe(0)
  })

  it('counts image operators inside OCG', async () => {
    const fnArray = [OPS.beginMarkedContentProps, OPS.paintImageXObject, OPS.endMarkedContent]
    const argsArray = [['/OC', { '10 0 R': true }], ['img1'], []]
    const page = makeMockPage(fnArray, argsArray)
    const result = await countObjectsPerPage(page, ['10 0 R'])
    expect(result['10 0 R']).toBe(1)
  })

  it('handles nested non-OC marked content', async () => {
    const fnArray = [
      OPS.beginMarkedContentProps,
      OPS.stroke,
      OPS.beginMarkedContentProps,
      OPS.fill,
      OPS.endMarkedContent,
      OPS.endMarkedContent,
    ]
    const argsArray = [
      ['/OC', { '10 0 R': true }], [], ['Span', {}], [], [], [],
    ]
    const page = makeMockPage(fnArray, argsArray)
    const result = await countObjectsPerPage(page, ['10 0 R'])
    expect(result['10 0 R']).toBe(2)
  })
})
