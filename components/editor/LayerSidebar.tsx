'use client'

import { useState } from 'react'
import { useProjectStore } from '@/lib/state/project-store'

export function LayerSidebar() {
  const { layers, updateLayer, toggleLayerVisible, selectedLayerIds, setSelectedLayers } =
    useProjectStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const totalSelectedCount = layers
    .filter((l) => selectedLayerIds.includes(l.id))
    .reduce((sum, l) => sum + l.count, 0)

  const startEdit = (id: string, name: string) => {
    setEditingId(id)
    setEditName(name)
  }

  const commitEdit = (id: string) => {
    if (editName.trim()) updateLayer(id, { name: editName.trim() })
    setEditingId(null)
  }

  const toggleSelect = (id: string) => {
    setSelectedLayers(
      selectedLayerIds.includes(id)
        ? selectedLayerIds.filter((s) => s !== id)
        : [...selectedLayerIds, id]
    )
  }

  return (
    <aside className="h-full flex flex-col bg-white border-l border-outline-variant overflow-hidden">
      <div className="p-4 border-b border-outline-variant flex-shrink-0">
        <h2 className="text-base font-semibold text-on-surface">Layers</h2>
        <p className="text-xs text-on-surface-variant">{layers.length} detected</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {layers.length === 0 && (
          <p className="p-4 text-sm text-on-surface-variant">No layers found. Draw a zone to count manually.</p>
        )}
        {layers.map((layer) => (
          <div
            key={layer.id}
            className={`flex items-center gap-2 px-4 py-3 border-b border-outline-variant/50 hover:bg-surface-container-low transition-colors
              ${selectedLayerIds.includes(layer.id) ? 'bg-surface-container-low' : ''}`}
          >
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: layer.color }} />

            <button
              onClick={() => toggleLayerVisible(layer.id)}
              className="text-on-surface-variant hover:text-primary transition-colors flex-shrink-0"
              title={layer.visible ? 'Hide layer' : 'Show layer'}
            >
              <span className="material-symbols-outlined text-base">
                {layer.visible ? 'visibility' : 'visibility_off'}
              </span>
            </button>

            <div className="flex-1 min-w-0">
              {editingId === layer.id ? (
                <input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => commitEdit(layer.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitEdit(layer.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  className="w-full text-sm border border-primary rounded px-1 py-0.5 outline-none"
                />
              ) : (
                <button
                  onClick={() => startEdit(layer.id, layer.name)}
                  className="w-full text-left text-sm text-on-surface truncate hover:text-primary transition-colors"
                  title={`${layer.name} — click to rename`}
                >
                  {layer.name}
                  <span className="ml-1 text-[10px] text-outline uppercase">{layer.source}</span>
                </button>
              )}
            </div>

            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full flex-shrink-0">
              {layer.count.toLocaleString()}
            </span>

            <input
              type="checkbox"
              checked={selectedLayerIds.includes(layer.id)}
              onChange={() => toggleSelect(layer.id)}
              className="accent-primary flex-shrink-0"
              title="Include in summary"
            />
          </div>
        ))}
      </div>

      {selectedLayerIds.length > 0 && (
        <div className="p-4 border-t border-outline-variant bg-surface-container-low flex-shrink-0">
          <h3 className="text-xs font-semibold uppercase text-on-surface-variant mb-2">Selected Summary</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-on-surface-variant">
                <th className="text-left pb-1">Layer</th>
                <th className="text-right pb-1">Count</th>
              </tr>
            </thead>
            <tbody>
              {layers
                .filter((l) => selectedLayerIds.includes(l.id))
                .map((l) => (
                  <tr key={l.id}>
                    <td className="text-on-surface truncate max-w-[120px] py-0.5">{l.name}</td>
                    <td className="text-right font-semibold text-primary py-0.5">{l.count.toLocaleString()}</td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-outline-variant">
                <td className="pt-1 font-bold">Total</td>
                <td className="text-right pt-1 font-bold text-primary">{totalSelectedCount.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </aside>
  )
}
