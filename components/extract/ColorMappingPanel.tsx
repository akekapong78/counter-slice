'use client'

import { useProjectStore } from '@/lib/state/project-store'

const LABEL_OPTIONS = ['RM', 'IN', 'RP', 'ignore'] as const

export function ColorMappingPanel() {
  const { colorMappings, upsertColorMapping } = useProjectStore()

  if (colorMappings.length === 0) {
    return <p className="text-xs text-on-surface-variant p-3">No colors detected yet.</p>
  }

  return (
    <div className="p-3 space-y-2">
      <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Color Mapping</h3>
      {colorMappings.map((m) => (
        <div key={m.hex} className="flex items-center gap-2">
          <div className="w-5 h-5 rounded border border-outline-variant flex-shrink-0" style={{ backgroundColor: m.hex }} />
          <span className="text-xs text-on-surface-variant font-mono">{m.hex}</span>
          <select
            value={m.label}
            onChange={(e) => upsertColorMapping({ ...m, label: e.target.value as typeof m.label })}
            className="ml-auto text-xs border border-outline-variant rounded px-1 py-0.5 bg-surface"
          >
            {LABEL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  )
}
