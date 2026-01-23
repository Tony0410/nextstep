import PDFDocument from 'pdfkit'
import { format, subDays } from 'date-fns'

interface PatientInfo {
  name: string
  patientName?: string | null
  patientDOB?: Date | string | null
  bloodType?: string | null
  allergies?: string | null
  medicalConditions?: string | null
  primaryPhysician?: string | null
  physicianPhone?: string | null
  clinicPhone?: string | null
  emergencyPhone?: string | null
}

interface Medication {
  id: string
  name: string
  instructions: string | null
  scheduleType: string
  active: boolean
}

interface Appointment {
  id: string
  title: string
  datetime: Date | string
  location: string | null
  notes: string | null
}

interface Symptom {
  id: string
  type: string
  customName: string | null
  severity: number
  notes: string | null
  recordedAt: Date | string
}

interface SummaryData {
  patient: PatientInfo
  medications: Medication[]
  appointments: Appointment[]
  symptoms: Symptom[]
  generatedAt: Date
}

const SYMPTOM_LABELS: Record<string, string> = {
  FATIGUE: 'Fatigue',
  NAUSEA: 'Nausea',
  PAIN: 'Pain',
  APPETITE: 'Appetite Changes',
  SLEEP: 'Sleep Issues',
  MOOD: 'Mood Changes',
  CUSTOM: 'Other',
}

const SEVERITY_LABELS = ['Minimal', 'Mild', 'Moderate', 'Severe', 'Extreme']

export function generateMedicalSummaryPDF(data: SummaryData): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: `Medical Summary - ${data.patient.patientName || data.patient.name}`,
      Author: 'NextStep Health Management',
      Subject: 'Medical Summary',
      CreationDate: data.generatedAt,
    },
  })

  const pageWidth = doc.page.width - 100 // Minus margins

  // Header
  doc
    .fontSize(24)
    .font('Helvetica-Bold')
    .text('Medical Summary', { align: 'center' })
    .moveDown(0.5)

  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#666666')
    .text(`Generated: ${format(data.generatedAt, 'MMMM d, yyyy h:mm a')}`, { align: 'center' })
    .moveDown(1.5)
    .fillColor('#000000')

  // Patient Information Section
  addSectionHeader(doc, 'Patient Information')

  const patientInfo = [
    ['Name', data.patient.patientName || data.patient.name || 'Not specified'],
    ['Date of Birth', data.patient.patientDOB ? format(new Date(data.patient.patientDOB), 'MMMM d, yyyy') : 'Not specified'],
    ['Blood Type', data.patient.bloodType || 'Not specified'],
    ['Primary Physician', data.patient.primaryPhysician || 'Not specified'],
    ['Physician Phone', data.patient.physicianPhone || 'Not specified'],
    ['Clinic Phone', data.patient.clinicPhone || 'Not specified'],
    ['Emergency Contact', data.patient.emergencyPhone || 'Not specified'],
  ]

  for (const [label, value] of patientInfo) {
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text(`${label}: `, { continued: true })
      .font('Helvetica')
      .text(value)
  }

  doc.moveDown(0.5)

  // Allergies (highlighted)
  if (data.patient.allergies) {
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#DC2626')
      .text('ALLERGIES: ', { continued: true })
      .font('Helvetica')
      .text(data.patient.allergies)
      .fillColor('#000000')
  }

  // Medical Conditions
  if (data.patient.medicalConditions) {
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Medical Conditions: ', { continued: true })
      .font('Helvetica')
      .text(data.patient.medicalConditions)
  }

  doc.moveDown(1)

  // Current Medications Section
  addSectionHeader(doc, `Current Medications (${data.medications.filter(m => m.active).length})`)

  const activeMeds = data.medications.filter((m) => m.active)
  if (activeMeds.length === 0) {
    doc.fontSize(10).font('Helvetica-Oblique').text('No active medications')
  } else {
    for (const med of activeMeds) {
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`• ${med.name}`, { continued: med.instructions ? true : false })

      if (med.instructions) {
        doc.font('Helvetica').text(` - ${med.instructions}`)
      } else {
        doc.text('')
      }

      doc.fontSize(9).fillColor('#666666').text(`  Schedule: ${formatScheduleType(med.scheduleType)}`).fillColor('#000000')
    }
  }

  doc.moveDown(1)

  // Upcoming Appointments Section
  const upcomingAppts = data.appointments
    .filter((a) => new Date(a.datetime) >= new Date())
    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime())
    .slice(0, 5)

  addSectionHeader(doc, `Upcoming Appointments (${upcomingAppts.length})`)

  if (upcomingAppts.length === 0) {
    doc.fontSize(10).font('Helvetica-Oblique').text('No upcoming appointments')
  } else {
    for (const appt of upcomingAppts) {
      const apptDate = new Date(appt.datetime)
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`• ${format(apptDate, 'EEE, MMM d')} at ${format(apptDate, 'h:mm a')}`)
        .font('Helvetica')
        .text(`  ${appt.title}${appt.location ? ` - ${appt.location}` : ''}`)
    }
  }

  doc.moveDown(1)

  // Recent Symptoms Section (last 30 days)
  const thirtyDaysAgo = subDays(new Date(), 30)
  const recentSymptoms = data.symptoms
    .filter((s) => new Date(s.recordedAt) >= thirtyDaysAgo)
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())

  // Group by type
  const symptomSummary = recentSymptoms.reduce(
    (acc, s) => {
      const key = s.type
      if (!acc[key]) {
        acc[key] = { count: 0, totalSeverity: 0, maxSeverity: 0 }
      }
      acc[key].count++
      acc[key].totalSeverity += s.severity
      acc[key].maxSeverity = Math.max(acc[key].maxSeverity, s.severity)
      return acc
    },
    {} as Record<string, { count: number; totalSeverity: number; maxSeverity: number }>
  )

  addSectionHeader(doc, 'Symptoms (Last 30 Days)')

  if (Object.keys(symptomSummary).length === 0) {
    doc.fontSize(10).font('Helvetica-Oblique').text('No symptoms recorded in the last 30 days')
  } else {
    for (const [type, stats] of Object.entries(symptomSummary).sort((a, b) => b[1].count - a[1].count)) {
      const avgSeverity = Math.round(stats.totalSeverity / stats.count)
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(`• ${SYMPTOM_LABELS[type] || type}: `, { continued: true })
        .font('Helvetica')
        .text(`${stats.count} occurrence(s), Avg: ${SEVERITY_LABELS[avgSeverity - 1]}, Max: ${SEVERITY_LABELS[stats.maxSeverity - 1]}`)
    }
  }

  doc.moveDown(1.5)

  // Footer
  doc
    .fontSize(8)
    .fillColor('#999999')
    .text('This document is for informational purposes only and does not constitute medical advice.', { align: 'center' })
    .text('Generated by NextStep Health Management', { align: 'center' })

  return doc
}

function addSectionHeader(doc: PDFKit.PDFDocument, title: string) {
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#1E3A8A')
    .text(title)
    .moveDown(0.3)
    .strokeColor('#1E3A8A')
    .lineWidth(1)
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .stroke()
    .moveDown(0.5)
    .fillColor('#000000')
}

function formatScheduleType(type: string): string {
  switch (type) {
    case 'FIXED_TIMES':
      return 'Fixed times daily'
    case 'INTERVAL':
      return 'At regular intervals'
    case 'WEEKDAYS':
      return 'Specific days of the week'
    case 'PRN':
      return 'As needed'
    default:
      return type
  }
}
