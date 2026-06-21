'use client'

import { useCallback, useRef, useState } from 'react'

type Props = {
  onFile: (file: File) => void
  isProcessing: boolean
}

export function Dropzone({ onFile, isProcessing }: Props) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (file.type === 'application/pdf') onFile(file)
  }, [onFile])

  return (
    <div
      className={`w-full max-w-3xl aspect-[16/9] border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer relative overflow-hidden
        ${isDragOver
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-outline-variant bg-surface-container-lowest hover:border-primary-container'}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
      }}
      onClick={() => inputRef.current?.click()}
    >
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#0041c8 1px, transparent 1px)', backgroundSize: '24px 24px' }}
      />

      {isProcessing ? (
        <div className="flex flex-col items-center gap-4 z-10">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center animate-pulse">
            <span className="material-symbols-outlined text-white text-3xl">sync</span>
          </div>
          <p className="text-xl font-semibold text-on-surface">Analyzing PDF layers…</p>
          <div className="w-64 h-1 bg-surface-container-highest rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: '40%', animation: 'loading 1.5s ease-in-out infinite' }}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center px-6 z-10">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-primary/10 transition-transform duration-300 ${isDragOver ? 'scale-110' : ''}`}>
            <span className="material-symbols-outlined text-primary text-[40px]" style={{ fontVariationSettings: "'FILL' 1" }}>description</span>
          </div>
          <h2 className="text-xl font-semibold text-on-surface mb-1">Smart Upload</h2>
          <p className="text-base text-on-surface-variant mb-6">Drag and drop your PDF here or click to browse</p>
          <button className="bg-primary text-white px-8 py-3 rounded-lg text-sm font-semibold shadow-md hover:shadow-lg hover:bg-primary-container transition-all active:scale-95">
            Upload PDF
          </button>
          <span className="mt-4 text-xs text-outline uppercase tracking-widest">Only PDF files supported</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
    </div>
  )
}
