'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProjectStore } from '@/lib/state/project-store'
import { ReportPreview } from '@/components/report/ReportPreview'
import { ExportButtons } from '@/components/report/ExportButtons'

export default function ReportPage() {
  const router = useRouter()
  const { pdfData, fileName, layers } = useProjectStore()

  useEffect(() => { if (!pdfData) router.push('/') }, [pdfData, router])
  if (!pdfData) return null

  const totalCount = layers.reduce((s, l) => s + l.count, 0)

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      <div className="min-h-screen bg-background">
        <nav className="sticky top-0 z-50 flex items-center justify-between px-8 h-16 bg-surface border-b border-outline-variant">
          <div className="flex items-center gap-4">
            <Link href="/editor" className="flex items-center gap-1 text-primary text-sm font-medium hover:underline">
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Back to Editor
            </Link>
            <span className="text-base font-semibold text-on-surface truncate max-w-sm">
              Report: {fileName}
            </span>
          </div>
          <span className="text-sm font-bold text-primary">Counter-Slice</span>
        </nav>

        <main className="max-w-[1440px] mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
          <div className="bg-surface-container-low rounded-xl border border-outline-variant p-6 flex justify-center overflow-auto">
            <ReportPreview />
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-outline-variant p-5">
              <h3 className="text-sm font-semibold text-on-surface mb-4">Summary</h3>
              <div className="space-y-3">
                {[
                  { label: 'Total Layers', value: layers.length },
                  { label: 'Total Objects', value: totalCount.toLocaleString() },
                  { label: 'OCG Layers', value: layers.filter((l) => l.source === 'ocg').length },
                  { label: 'Manual Zones', value: layers.filter((l) => l.source === 'zone').length },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="text-on-surface-variant">{label}</span>
                    <span className="font-bold text-on-surface">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-outline-variant p-5">
              <h3 className="text-sm font-semibold text-on-surface mb-4">Export</h3>
              <ExportButtons />
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
