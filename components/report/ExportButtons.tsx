'use client'

import { useRef, useState } from 'react'
import { useProjectStore } from '@/lib/state/project-store'
import { exportPdfReport } from '@/lib/export/pdf-report'
import { exportCsv } from '@/lib/export/csv-export'
import { exportExcel } from '@/lib/export/excel-export'
import { exportProjectJson, importProjectJson } from '@/lib/export/json-io'

export function ExportButtons() {
  const { fileName, pageCount, layers, setLayers } = useProjectStore()
  const [loading, setLoading] = useState<string | null>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)

  const run = async (key: string, fn: () => Promise<void>) => {
    setLoading(key)
    try { await fn() } finally { setLoading(null) }
  }

  const handleImport = async (file: File) => {
    try {
      const project = await importProjectJson(file)
      setLayers(project.layers)
    } catch {
      alert('Invalid project file.')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={() => run('pdf', () => exportPdfReport(layers, fileName))}
        disabled={!!loading}
        className="w-full flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-base">download</span>
        {loading === 'pdf' ? 'Generating…' : 'Download PDF Report'}
      </button>

      <button
        onClick={() => run('csv', async () => exportCsv(layers, fileName))}
        disabled={!!loading}
        className="w-full flex items-center gap-2 border border-outline-variant text-on-surface px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-base">table_view</span>
        {loading === 'csv' ? 'Exporting…' : 'Export CSV'}
      </button>

      <button
        onClick={() => run('xlsx', () => exportExcel(layers, fileName))}
        disabled={!!loading}
        className="w-full flex items-center gap-2 border border-outline-variant text-on-surface px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-surface-container-low transition-colors disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-base">grid_on</span>
        {loading === 'xlsx' ? 'Exporting…' : 'Export Excel'}
      </button>

      <div className="border-t border-outline-variant pt-3 flex gap-2">
        <button
          onClick={() => exportProjectJson({ fileName, pageCount, layers })}
          className="flex-1 flex items-center justify-center gap-1 border border-outline-variant text-on-surface-variant px-3 py-2 rounded-lg text-xs font-medium hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-sm">save</span>
          Save Project
        </button>
        <button
          onClick={() => jsonInputRef.current?.click()}
          className="flex-1 flex items-center justify-center gap-1 border border-outline-variant text-on-surface-variant px-3 py-2 rounded-lg text-xs font-medium hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-sm">upload_file</span>
          Load Project
        </button>
        <input
          ref={jsonInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f) }}
        />
      </div>
    </div>
  )
}
