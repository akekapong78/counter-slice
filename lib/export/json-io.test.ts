import { describe, it, expect } from 'vitest'
import { importProjectJson } from './json-io'
import type { Layer } from '@/lib/types'

const sampleLayers: Layer[] = [
  { id: '1', name: 'WALL', source: 'ocg', ocgRef: '10 0 R', count: 42, visible: true, color: '#3b82f6' },
]

describe('importProjectJson', () => {
  it('parses valid JSON project file', async () => {
    const data = { fileName: 'test.pdf', pageCount: 3, layers: sampleLayers }
    const file = new File([JSON.stringify(data)], 'project.json', { type: 'application/json' })
    const result = await importProjectJson(file)
    expect(result.fileName).toBe('test.pdf')
    expect(result.pageCount).toBe(3)
    expect(result.layers).toHaveLength(1)
    expect(result.layers[0].name).toBe('WALL')
  })

  it('throws on invalid JSON', async () => {
    const file = new File(['not json'], 'bad.json', { type: 'application/json' })
    await expect(importProjectJson(file)).rejects.toThrow()
  })

  it('throws when layers field is missing', async () => {
    const file = new File([JSON.stringify({ fileName: 'x.pdf' })], 'bad.json')
    await expect(importProjectJson(file)).rejects.toThrow('missing layers')
  })
})
