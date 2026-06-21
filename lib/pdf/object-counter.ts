import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import type { OcgGroup } from './ocg-parser'

const OPS_BEGIN_MARKED_CONTENT_PROPS = 72
const OPS_END_MARKED_CONTENT = 73

const PAINT_OPS = new Set([
  19,  // stroke
  20,  // fill
  21,  // fillStroke
  57,  // paintFormXObject
  82,  // paintJpegXObject
  85,  // paintImageXObject
  86,  // paintInlineImageXObject
  43,  // showText
  44,  // showSpacedText
  45,  // nextLineShowText
  46,  // nextLineSetSpacingShowText
])

export async function countObjectsPerPage(
  page: PDFPageProxy,
  ocgRefs: string[]
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  for (const ref of ocgRefs) counts[ref] = 0

  const { fnArray, argsArray } = await page.getOperatorList()
  const ocgStack: (string | null)[] = []

  for (let i = 0; i < fnArray.length; i++) {
    const op = fnArray[i]
    const args = argsArray[i]

    if (op === OPS_BEGIN_MARKED_CONTENT_PROPS) {
      const tag = args[0]
      const props = args[1]
      if (tag === '/OC' && props && typeof props === 'object') {
        const matchedRef = ocgRefs.find((ref) => props[ref] !== undefined)
        ocgStack.push(matchedRef ?? null)
      } else {
        ocgStack.push(null)
      }
    } else if (op === OPS_END_MARKED_CONTENT) {
      ocgStack.pop()
    } else if (PAINT_OPS.has(op)) {
      for (let s = ocgStack.length - 1; s >= 0; s--) {
        const activeRef = ocgStack[s]
        if (activeRef !== null && counts[activeRef] !== undefined) {
          counts[activeRef]++
          break
        }
      }
    }
  }

  return counts
}

export async function countObjectsForAllPages(
  pdfDoc: PDFDocumentProxy,
  ocgGroups: OcgGroup[]
): Promise<Record<string, number>> {
  const refs = ocgGroups.map((g) => g.ref)
  const totalCounts: Record<string, number> = {}
  for (const ref of refs) totalCounts[ref] = 0

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum)
    const pageCounts = await countObjectsPerPage(page, refs)
    for (const ref of refs) totalCounts[ref] += pageCounts[ref] ?? 0
  }

  return totalCounts
}
