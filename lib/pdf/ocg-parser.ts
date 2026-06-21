import type { PDFDocumentProxy } from 'pdfjs-dist'

export type OcgGroup = {
  ref: string
  name: string
  defaultVisible: boolean
}

export async function extractOcgGroups(pdfDoc: PDFDocumentProxy): Promise<OcgGroup[]> {
  const ocConfig = await pdfDoc.getOptionalContentConfig()
  const groups = ocConfig.getGroups()
  if (!groups) return []

  return Object.entries(groups).map(([ref, group]) => {
    const g = group as { name?: string }
    return {
      ref,
      name: g.name ?? ref,
      defaultVisible: true,
    }
  })
}
