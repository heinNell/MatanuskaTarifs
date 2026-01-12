import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Client, ClientRoute, Route } from '../types'

export interface OrganizationBranding {
  companyName: string
  logoUrl?: string
  logoBase64?: string
  tagline?: string
  address: string
  phone: string
  email: string
  website?: string
  vatNumber?: string
  registrationNumber?: string
  primaryColor: string
  accentColor: string
}

export interface RateSheetData {
  client: Client
  routes: (ClientRoute & { route?: Partial<Route> })[]
  effectiveDate: string
  validUntil: string
  customNotes?: string
  termsAndConditions?: string
  preparedBy?: string
  reference?: string
}

const defaultBranding: OrganizationBranding = {
  companyName: 'Matanuska Transport',
  tagline: 'Your Trusted Logistics Partner',
  address: '123 Logistics Drive, Johannesburg, 2000',
  phone: '+27 11 555 0000',
  email: 'rates@matanuska.co.za',
  website: 'www.matanuska.co.za',
  vatNumber: '4000000000',
  registrationNumber: '2020/000000/07',
  primaryColor: '#1e40af',
  accentColor: '#3b82f6',
}

export function generateClientRateSheet(
  data: RateSheetData,
  branding: Partial<OrganizationBranding> = {}
): jsPDF {
  const org = { ...defaultBranding, ...branding }
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  // A4 dimensions: 210mm x 297mm
  const pageWidth = doc.internal.pageSize.getWidth() // 210mm
  const pageHeight = doc.internal.pageSize.getHeight() // 297mm
  const margin = 12 // Reduced margin for better space utilization
  const contentWidth = pageWidth - margin * 2
  const footerHeight = 18
  const usableHeight = pageHeight - footerHeight - margin
  let yPos = margin
  let currentPage = 1
  let totalPages = 1

  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 }
  }

  const primaryRgb = hexToRgb(org.primaryColor)
  const accentRgb = hexToRgb(org.accentColor)
  const rightX = pageWidth - margin

  // Helper function to add footer on current page
  const addFooter = (pageNum: number, total: number) => {
    const footerY = pageHeight - 16
    
    // Footer line
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.2)
    doc.line(margin, footerY - 4, pageWidth - margin, footerY - 4)
    
    doc.setTextColor(120, 120, 120)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    
    // Left footer
    doc.text(org.companyName, margin, footerY)
    const shortAddress = org.address.length > 50 ? org.address.substring(0, 50) + '...' : org.address
    doc.text(shortAddress, margin, footerY + 3.5)
    
    // Registration info
    const regInfo = []
    if (org.registrationNumber) regInfo.push(`Reg: ${org.registrationNumber}`)
    if (org.vatNumber) regInfo.push(`VAT: ${org.vatNumber}`)
    if (regInfo.length > 0) {
      doc.text(regInfo.join(' | '), margin, footerY + 7)
    }
    
    // Right footer
    doc.text(`Generated: ${formatDate(new Date().toISOString())}`, rightX, footerY, { align: 'right' })
    if (data.preparedBy) {
      doc.text(`Prepared by: ${data.preparedBy}`, rightX, footerY + 3.5, { align: 'right' })
    }
    doc.text(`Page ${pageNum} of ${total}`, rightX, footerY + 7, { align: 'right' })
  }

  // Helper function to check if new page is needed and add one if so
  const checkNewPage = (neededSpace: number): boolean => {
    if (yPos + neededSpace > usableHeight) {
      addFooter(currentPage, totalPages)
      doc.addPage()
      currentPage++
      yPos = margin
      return true
    }
    return false
  }

  // ============ HEADER SECTION ============
  // Professional header with logo on top left, company name below
  const headerHeight = 38
  doc.setFillColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
  doc.rect(0, 0, pageWidth, headerHeight, 'F')

  // Logo (if provided) - top left corner
  let companyNameY = 14
  if (org.logoBase64) {
    try {
      // Logo in top left corner - wider and shorter
      const logoWidth = 42
      const logoHeight = 14
      const logoX = margin
      const logoY = 4
      doc.addImage(org.logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight)
      companyNameY = logoY + logoHeight + 4 // Company name below logo
    } catch (e) {
      console.error('Error adding logo to PDF:', e)
    }
  }

  // Company Name - below logo on left side
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(org.companyName, margin, companyNameY)

  // Tagline - below company name
  if (org.tagline) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(org.tagline, margin, companyNameY + 5)
  }

  // Contact Info (right side) - clean layout
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(org.phone, rightX, 10, { align: 'right' })
  doc.text(org.email, rightX, 15, { align: 'right' })
  if (org.website) {
    doc.text(org.website, rightX, 20, { align: 'right' })
  }

  // ============ DOCUMENT TITLE SECTION ============
  yPos = headerHeight + 8
  doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('CLIENT RATE SHEET', margin, yPos)

  // Reference Number
  if (data.reference) {
    doc.setFontSize(9)
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'normal')
    doc.text(`Reference: ${data.reference}`, rightX, yPos, { align: 'right' })
  }

  // Divider line
  yPos += 4
  doc.setDrawColor(accentRgb.r, accentRgb.g, accentRgb.b)
  doc.setLineWidth(0.5)
  doc.line(margin, yPos, pageWidth - margin, yPos)

  // ============ CLIENT INFORMATION SECTION ============
  yPos += 8
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(margin, yPos, contentWidth, 28, 2, 2, 'F')

  yPos += 7
  doc.setTextColor(50, 50, 50)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('CLIENT DETAILS', margin + 6, yPos)

  yPos += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(`Company: ${data.client.company_name}`, margin + 6, yPos)
  doc.text(`Client Code: ${data.client.client_code}`, pageWidth / 2 + 10, yPos)

  yPos += 5
  if (data.client.contact_person) {
    doc.text(`Contact: ${data.client.contact_person}`, margin + 6, yPos)
  }
  if (data.client.email) {
    doc.text(`Email: ${data.client.email}`, pageWidth / 2 + 10, yPos)
  }

  yPos += 5
  if (data.client.address) {
    const address = [data.client.address, data.client.city, data.client.province, data.client.postal_code]
      .filter(Boolean)
      .join(', ')
    const truncatedAddress = address.length > 70 ? address.substring(0, 70) + '...' : address
    doc.text(`Address: ${truncatedAddress}`, margin + 6, yPos)
  }

  // ============ VALIDITY SECTION ============
  yPos += 12
  doc.setFillColor(accentRgb.r, accentRgb.g, accentRgb.b)
  doc.roundedRect(margin, yPos, contentWidth, 10, 2, 2, 'F')
  
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  yPos += 7
  doc.text(`Effective Date: ${formatDate(data.effectiveDate)}`, margin + 6, yPos)
  doc.text(`Valid Until: ${formatDate(data.validUntil)}`, rightX - 6, yPos, { align: 'right' })

  // ============ RATES TABLE ============
  yPos += 10
  
  const tableData = data.routes.map((cr) => [
    cr.route?.route_code || '-',
    cr.route?.origin || '-',
    cr.route?.destination || '-',
    `${cr.route?.distance_km || 0} km`,
    formatCurrency(cr.current_rate),
  ])

  autoTable(doc, {
    startY: yPos,
    head: [['Route', 'Origin', 'Destination', 'Distance', 'Rate']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [primaryRgb.r, primaryRgb.g, primaryRgb.b],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      cellPadding: 4,
      halign: 'center',
      valign: 'middle',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50],
      cellPadding: 4,
      valign: 'middle',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'bold', halign: 'left' },
      1: { cellWidth: 'auto', halign: 'left' },
      2: { cellWidth: 'auto', halign: 'left' },
      3: { cellWidth: 30, halign: 'center' },
      4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    styles: {
      lineColor: [220, 220, 220],
      lineWidth: 0.1,
    },
  })

  // Get the final Y position after the table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  yPos = (doc as any).lastAutoTable.finalY + 8

  // ============ CUSTOM NOTES SECTION ============
  if (data.customNotes) {
    const notesLines = doc.splitTextToSize(data.customNotes, contentWidth - 8)
    const notesHeight = notesLines.length * 3.5 + 10
    
    checkNewPage(notesHeight)
    
    doc.setFillColor(255, 251, 235)
    doc.setDrawColor(251, 191, 36)
    doc.setLineWidth(0.3)
    
    doc.roundedRect(margin, yPos, contentWidth, notesHeight, 1.5, 1.5, 'FD')
    
    yPos += 5
    doc.setTextColor(146, 64, 14)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('NOTES', margin + 4, yPos)
    
    yPos += 4
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(80, 80, 80)
    doc.text(notesLines, margin + 4, yPos)
    
    yPos += notesLines.length * 3.5 + 4
  }

  // ============ TERMS & CONDITIONS SECTION (Multi-page support) ============
  if (data.termsAndConditions) {
    const termsLines = doc.splitTextToSize(data.termsAndConditions, contentWidth)
    const lineHeight = 3.2
    const headerHeight = 10
    
    // Calculate total pages needed
    const linesPerPage = Math.floor((usableHeight - headerHeight) / lineHeight)
    const firstPageLines = Math.floor((usableHeight - yPos - headerHeight) / lineHeight)
    
    let remainingLines = termsLines.length
    if (remainingLines > firstPageLines) {
      remainingLines -= firstPageLines
      totalPages = 1 + Math.ceil(remainingLines / linesPerPage)
    }
    
    // Check if we need to start on a new page
    const minSpaceForTerms = 30 // At least 30mm needed for T&C header + some content
    if (yPos + minSpaceForTerms > usableHeight) {
      addFooter(currentPage, totalPages)
      doc.addPage()
      currentPage++
      yPos = margin
    }
    
    // Terms header
    yPos += 4
    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('TERMS & CONDITIONS', margin, yPos)
    
    yPos += 3
    doc.setDrawColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
    doc.setLineWidth(0.2)
    doc.line(margin, yPos, margin + 40, yPos)
    
    yPos += 5
    doc.setTextColor(70, 70, 70)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    
    // Print terms line by line with page breaks
    for (let i = 0; i < termsLines.length; i++) {
      // Check if we need a new page
      if (yPos + lineHeight > usableHeight) {
        addFooter(currentPage, totalPages)
        doc.addPage()
        currentPage++
        yPos = margin
        
        // Add continuation header
        doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'bold')
        doc.text('TERMS & CONDITIONS (continued)', margin, yPos)
        yPos += 5
        doc.setTextColor(70, 70, 70)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
      }
      
      doc.text(termsLines[i], margin, yPos)
      yPos += lineHeight
    }
  }

  // Add footer to last page
  addFooter(currentPage, totalPages > currentPage ? totalPages : currentPage)

  return doc
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function downloadPdf(doc: jsPDF, filename: string): void {
  doc.save(filename)
}

export function openPdfInNewTab(doc: jsPDF): void {
  const blob = doc.output('blob')
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
}
