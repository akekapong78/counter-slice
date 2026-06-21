import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('exportCsv', () => {
  let createObjectURL: ReturnType<typeof vi.fn>

  beforeEach(() => {
    createObjectURL = vi.fn().mockReturnValue('blob:mock')
    global.URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL
    global.URL.revokeObjectURL = vi.fn()
    vi.spyOn(document.body, 'appendChild').mockImplementation((el: any) => {
      el.click = vi.fn()
      return el
    })
    vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el)
  })

  afterEach(() => { vi.restoreAllMocks() })

  it('triggers download with layer data in CSV', async () => {
    const { exportCsv } = await import('./csv-export')
    exportCsv(
      [{ id: '1', name: 'WALL', source: 'ocg', count: 42, visible: true, color: '#000' }],
      'test.pdf'
    )
    expect(createObjectURL).toHaveBeenCalledOnce()
    const blob: Blob = createObjectURL.mock.calls[0][0]
    const text = await blob.text()
    expect(text).toContain('WALL')
    expect(text).toContain('42')
    expect(text).toContain('Layer Name')
  })
})
