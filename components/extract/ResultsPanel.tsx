'use client'

import { useState, useMemo } from 'react'
import { useProjectStore } from '@/lib/state/project-store'
import { exportExtractCsvDetail, exportExtractCsvSummary } from '@/lib/export/extract-csv-export'
import { exportExtractExcel } from '@/lib/export/extract-excel-export'

type FilterAction = 'all' | 'RM' | 'IN' | 'RP' | 'unknown'

type Props = {
  onSelectBlock: (id: string, pageIndex: number) => void
  fileName: string
}

function downloadCsv(content: string, name: string) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function ResultsPanel({ onSelectBlock, fileName }: Props) {
  const { extractBlocks, equipmentNames, colorMappings } = useProjectStore()
  const [filter, setFilter] = useState<FilterAction>('all')
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'detail' | 'summary'>('detail')

  // Re-resolve actions when colorMappings change
  const mappingMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const cm of colorMappings) m.set(cm.rgb.join(','), cm.label)
    return m
  }, [colorMappings])

  const resolvedBlocks = useMemo(() =>
    extractBlocks.map((b) => {
      const label = mappingMap.get(b.color.join(',')) ?? 'unknown'
      return {
        ...b,
        action: (label === 'ignore' ? 'unknown' : label) as typeof b.action,
      }
    }), [extractBlocks, mappingMap])

  const filtered = resolvedBlocks.filter((b) => {
    if (filter !== 'all' && b.action !== filter) return false
    if (search && !b.poleId?.toLowerCase().includes(search.toLowerCase()) &&
        !b.items.some((i) => i.code.toLowerCase().includes(search.toLowerCase()))) return false
    return true
  })

  // Summary: aggregate by code using block.action (authoritative)
  const summary = useMemo(() => {
    const map = new Map<string, { RM: number; IN: number; RP: number }>()
    for (const b of resolvedBlocks) {
      if (b.action !== 'RM' && b.action !== 'IN' && b.action !== 'RP') continue
      for (const item of b.items) {
        if (!map.has(item.code)) map.set(item.code, { RM: 0, IN: 0, RP: 0 })
        map.get(item.code)![b.action]++
      }
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [resolvedBlocks])

  const nameMap = useMemo(() =>
    new Map(equipmentNames.map((n) => [n.code, n])), [equipmentNames])

  const actionBadge = (action: string) => {
    const colors: Record<string, string> = {
      RM: 'bg-red-100 text-red-700',
      IN: 'bg-blue-100 text-blue-700',
      RP: 'bg-yellow-100 text-yellow-700',
      unknown: 'bg-gray-100 text-gray-500',
    }
    return (
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${colors[action] ?? colors.unknown}`}>
        {action}
      </span>
    )
  }

  return (
    <div className="flex flex-col h-full text-sm">
      {/* Tabs */}
      <div className="flex border-b border-outline-variant">
        {(['detail', 'summary'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-medium capitalize border-b-2 transition-colors ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-on-surface-variant'
            }`}
          >{t}</button>
        ))}
      </div>

      {tab === 'detail' && (
        <>
          {/* Filter + Search */}
          <div className="flex gap-2 p-2 border-b border-outline-variant">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pole / code…"
              className="flex-1 text-xs border border-outline-variant rounded px-2 py-1 bg-surface outline-none focus:border-primary"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterAction)}
              className="text-xs border border-outline-variant rounded px-1 py-1 bg-surface"
            >
              {(['all', 'RM', 'IN', 'RP', 'unknown'] as const).map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Block list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.map((block) => (
              <button
                key={block.id}
                onClick={() => onSelectBlock(block.id, block.pageIndex)}
                className="w-full text-left px-3 py-2 border-b border-outline-variant/50 hover:bg-surface-container-low transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  {block.poleId && (
                    <span className="text-xs font-mono font-semibold text-on-surface">{block.poleId}</span>
                  )}
                  {actionBadge(block.action)}
                  <span className="text-[10px] text-on-surface-variant ml-auto">p.{block.pageIndex + 1}</span>
                </div>
                <div className="text-[11px] text-on-surface-variant leading-relaxed">
                  {block.items.map((i) => i.code).join(', ')}
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-on-surface-variant p-4 text-center">No results</p>
            )}
          </div>
        </>
      )}

      {tab === 'summary' && (
        <div className="flex-1 overflow-auto">
          <table className="text-xs w-full">
            <thead className="sticky top-0 bg-surface border-b border-outline-variant">
              <tr>
                {['Code', 'Thai Name', 'Unit', 'RM', 'IN', 'RP'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-on-surface-variant">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.map(([code, counts]) => {
                const entry = nameMap.get(code)
                return (
                  <tr key={code} className="border-b border-outline-variant/40 hover:bg-surface-container-low">
                    <td className="px-3 py-1.5 font-mono">{code}</td>
                    <td className="px-3 py-1.5 text-on-surface-variant">{entry?.nameTh ?? ''}</td>
                    <td className="px-3 py-1.5 text-on-surface-variant">{entry?.unit ?? ''}</td>
                    <td className="px-3 py-1.5 text-red-600 font-medium">{counts.RM || ''}</td>
                    <td className="px-3 py-1.5 text-blue-600 font-medium">{counts.IN || ''}</td>
                    <td className="px-3 py-1.5 text-yellow-600 font-medium">{counts.RP || ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Export buttons */}
      <div className="flex gap-2 p-3 border-t border-outline-variant">
        <button
          onClick={() => downloadCsv(exportExtractCsvDetail(resolvedBlocks, equipmentNames), `${fileName}-detail.csv`)}
          className="flex-1 text-xs bg-surface border border-outline-variant rounded py-1.5 hover:bg-surface-container-low"
        >Detail CSV</button>
        <button
          onClick={() => downloadCsv(exportExtractCsvSummary(resolvedBlocks, equipmentNames), `${fileName}-summary.csv`)}
          className="flex-1 text-xs bg-surface border border-outline-variant rounded py-1.5 hover:bg-surface-container-low"
        >Summary CSV</button>
        <button
          onClick={() => exportExtractExcel(resolvedBlocks, equipmentNames, fileName)}
          className="flex-1 text-xs bg-primary text-white rounded py-1.5 hover:bg-primary-container"
        >Excel</button>
      </div>
    </div>
  )
}
