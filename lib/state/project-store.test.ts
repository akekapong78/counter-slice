import { describe, it, expect, beforeEach } from 'vitest'
import { act } from '@testing-library/react'
import { useProjectStore } from './project-store'
import type { ExtractedBlock, ColorMapping, EquipmentName } from '@/lib/types'

describe('project-store', () => {
  beforeEach(() => {
    useProjectStore.getState().reset()
  })

  it('starts with empty state', () => {
    const state = useProjectStore.getState()
    expect(state.fileName).toBe('')
    expect(state.layers).toEqual([])
    expect(state.selectedLayerIds).toEqual([])
  })

  it('setFile stores fileName and pageCount', () => {
    const buf = new ArrayBuffer(8)
    useProjectStore.getState().setFile('test.pdf', 5, buf)
    const state = useProjectStore.getState()
    expect(state.fileName).toBe('test.pdf')
    expect(state.pageCount).toBe(5)
    expect(state.pdfData).toBe(buf)
  })

  it('addLayer adds a layer', () => {
    useProjectStore.getState().addLayer({
      id: 'layer-1', name: 'WALL', source: 'ocg',
      ocgRef: 'ocg-ref-1', count: 42, visible: true, color: '#3b82f6',
    })
    const { layers } = useProjectStore.getState()
    expect(layers).toHaveLength(1)
    expect(layers[0].name).toBe('WALL')
    expect(layers[0].count).toBe(42)
  })

  it('updateLayer updates name', () => {
    useProjectStore.getState().addLayer({
      id: 'layer-1', name: 'OLD', source: 'ocg', count: 0, visible: true, color: '#000',
    })
    useProjectStore.getState().updateLayer('layer-1', { name: 'NEW' })
    expect(useProjectStore.getState().layers[0].name).toBe('NEW')
  })

  it('toggleLayerVisible flips visible', () => {
    useProjectStore.getState().addLayer({
      id: 'layer-1', name: 'X', source: 'ocg', count: 0, visible: true, color: '#000',
    })
    useProjectStore.getState().toggleLayerVisible('layer-1')
    expect(useProjectStore.getState().layers[0].visible).toBe(false)
  })

  it('removeLayer removes by id', () => {
    useProjectStore.getState().addLayer({
      id: 'layer-1', name: 'X', source: 'ocg', count: 0, visible: true, color: '#000',
    })
    useProjectStore.getState().removeLayer('layer-1')
    expect(useProjectStore.getState().layers).toHaveLength(0)
  })

  it('setLayers replaces all layers', () => {
    useProjectStore.getState().setLayers([
      { id: 'a', name: 'A', source: 'ocg', count: 1, visible: true, color: '#f00' },
      { id: 'b', name: 'B', source: 'zone', count: 2, visible: true, color: '#0f0' },
    ])
    expect(useProjectStore.getState().layers).toHaveLength(2)
  })
})

describe('extract store slice', () => {
  beforeEach(() => {
    act(() => { useProjectStore.getState().reset() })
  })

  it('starts with empty extractBlocks', () => {
    expect(useProjectStore.getState().extractBlocks).toEqual([])
  })

  it('setExtractBlocks replaces blocks', () => {
    const block: ExtractedBlock = {
      id: 'b1', poleId: 'P351', pageIndex: 0,
      bbox: { x: 0.1, y: 0.2, width: 0.05, height: 0.03 },
      color: [255, 0, 0], action: 'RM',
      items: [{ code: '12-Y', action: 'RM' }],
    }
    act(() => { useProjectStore.getState().setExtractBlocks([block]) })
    expect(useProjectStore.getState().extractBlocks).toHaveLength(1)
  })

  it('upsertColorMapping adds new mapping', () => {
    const mapping: ColorMapping = { rgb: [255, 0, 0], hex: '#ff0000', label: 'RM' }
    act(() => { useProjectStore.getState().upsertColorMapping(mapping) })
    expect(useProjectStore.getState().colorMappings).toHaveLength(1)
  })

  it('upsertColorMapping updates existing mapping by rgb key', () => {
    const m1: ColorMapping = { rgb: [255, 0, 0], hex: '#ff0000', label: 'RM' }
    const m2: ColorMapping = { rgb: [255, 0, 0], hex: '#ff0000', label: 'IN' }
    act(() => { useProjectStore.getState().upsertColorMapping(m1) })
    act(() => { useProjectStore.getState().upsertColorMapping(m2) })
    const mappings = useProjectStore.getState().colorMappings
    expect(mappings).toHaveLength(1)
    expect(mappings[0].label).toBe('IN')
  })

  it('upsertEquipmentName adds new entry', () => {
    const name: EquipmentName = { code: '12-Y', nameTh: 'เสาคอนกรีต 12 เมตร', unit: 'ต้น' }
    act(() => { useProjectStore.getState().upsertEquipmentName(name) })
    expect(useProjectStore.getState().equipmentNames).toHaveLength(1)
  })

  it('upsertEquipmentName updates existing by code', () => {
    const n1: EquipmentName = { code: '12-Y', nameTh: 'เสา', unit: 'ต้น' }
    const n2: EquipmentName = { code: '12-Y', nameTh: 'เสาคอนกรีต 12 เมตร', unit: 'ต้น' }
    act(() => { useProjectStore.getState().upsertEquipmentName(n1) })
    act(() => { useProjectStore.getState().upsertEquipmentName(n2) })
    expect(useProjectStore.getState().equipmentNames[0].nameTh).toBe('เสาคอนกรีต 12 เมตร')
  })

  it('reset clears extract state', () => {
    act(() => {
      useProjectStore.getState().setExtractBlocks([{
        id: 'b1', poleId: null, pageIndex: 0,
        bbox: { x: 0, y: 0, width: 0.1, height: 0.1 },
        color: [0,0,0], action: 'unknown', items: [],
      }])
    })
    act(() => { useProjectStore.getState().reset() })
    expect(useProjectStore.getState().extractBlocks).toEqual([])
  })
})
