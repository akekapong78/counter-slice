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

  return Object.entries(groups).map(([ref, group]) => ({
    ref,
    name: group.name ?? ref,
    defaultVisible: true,
  }))
}
