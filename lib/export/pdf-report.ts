import type { Layer } from '@/lib/types'

export async function exportPdfReport(layers: Layer[], sourceFileName: string): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const generatedAt = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const totalCount = layers.reduce((sum, l) => sum + l.count, 0)

  // Header bar
  doc.setFillColor(0, 65, 200)
  doc.rect(0, 0, 210, 28, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(255, 255, 255)
  doc.text('Counter-Slice', 14, 12)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('PDF Layer Analysis Report', 14, 20)

  // Meta
  doc.setTextColor(11, 28, 48)
  doc.setFontSize(10)
  doc.text(`Document: ${sourceFileName}`, 14, 38)
  doc.text(`Generated: ${generatedAt}`, 14, 44)
  doc.text(`Total Layers: ${layers.length}`, 14, 50)
  doc.text(`Total Objects: ${totalCount.toLocaleString()}`, 14, 56)

  // Table
  autoTable(doc, {
    startY: 66,
    head: [['Layer Name', 'Object Count', 'Source', 'Status']],
    body: layers.map((l) => [
      l.name,
      l.count.toLocaleString(),
      l.source === 'ocg' ? 'OCG Layer' : 'Manual Zone',
      l.visible ? 'Active' : 'Hidden',
    ]),
    headStyles: { fillColor: [0, 65, 200], textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [239, 244, 255] },
    styles: { fontSize: 10, cellPadding: 4 },
  })

  doc.save(sourceFileName.replace(/\.pdf$/i, '') + '-report.pdf')
}
