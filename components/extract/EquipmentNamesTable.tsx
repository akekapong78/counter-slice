'use client'

import { useProjectStore } from '@/lib/state/project-store'

export function EquipmentNamesTable() {
  const { equipmentNames, extractBlocks, upsertEquipmentName } = useProjectStore()

  // Collect all unique codes from blocks
  const allCodes = Array.from(
    new Set(extractBlocks.flatMap((b) => b.items.map((i) => i.code)))
  ).sort()

  // Ensure all codes have an entry (add empty ones)
  const nameMap = new Map(equipmentNames.map((n) => [n.code, n]))
  const rows = allCodes.map((code) => nameMap.get(code) ?? { code, nameTh: '', unit: '' })

  if (rows.length === 0) return null

  return (
    <div className="p-3">
      <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Equipment Names</h3>
      <div className="overflow-auto max-h-48">
        <table className="text-xs w-full">
          <thead>
            <tr className="text-on-surface-variant border-b border-outline-variant">
              <th className="text-left py-1 pr-2">Code</th>
              <th className="text-left py-1 pr-2">Thai Name</th>
              <th className="text-left py-1">Unit</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code} className={`border-b border-outline-variant/40 ${row.nameTh === '' ? 'bg-yellow-50' : ''}`}>
                <td className="py-1 pr-2 font-mono text-on-surface">{row.code}</td>
                <td className="py-1 pr-2">
                  <input
                    value={row.nameTh}
                    onChange={(e) => upsertEquipmentName({ ...row, nameTh: e.target.value })}
                    placeholder="ชื่อภาษาไทย"
                    className="w-full bg-transparent border-b border-outline-variant/50 focus:border-primary outline-none text-xs"
                  />
                </td>
                <td className="py-1">
                  <input
                    value={row.unit}
                    onChange={(e) => upsertEquipmentName({ ...row, unit: e.target.value })}
                    placeholder="หน่วย"
                    className="w-20 bg-transparent border-b border-outline-variant/50 focus:border-primary outline-none text-xs"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
