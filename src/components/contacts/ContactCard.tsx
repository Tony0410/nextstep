'use client'

import { useState } from 'react'
import { Phone, Mail, MapPin, Clock, ChevronDown, ChevronUp, Star } from 'lucide-react'

interface Contact {
  id: string
  name: string
  role: string
  category: string
  phone: string
  phone2: string | null
  email: string | null
  address: string | null
  hours: string | null
  notes: string | null
  isEmergency: boolean
}

interface ContactCardProps {
  contact: Contact
  onEdit?: () => void
}

const CATEGORY_COLORS: Record<string, string> = {
  ONCOLOGY: 'bg-purple-100 text-purple-700',
  HOSPITAL: 'bg-blue-100 text-blue-700',
  PHARMACY: 'bg-green-100 text-green-700',
  INSURANCE: 'bg-amber-100 text-amber-700',
  FAMILY: 'bg-pink-100 text-pink-700',
  OTHER: 'bg-secondary-100 text-secondary-700',
}

export function ContactCard({ contact, onEdit }: ContactCardProps) {
  const [expanded, setExpanded] = useState(false)
  const initial = contact.name.charAt(0).toUpperCase()
  const categoryColor = CATEGORY_COLORS[contact.category] || CATEGORY_COLORS.OTHER

  return (
    <div className={`bg-surface rounded-card border p-4 ${
      contact.isEmergency ? 'border-red-200 bg-red-50/30' : 'border-border'
    }`}>
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${categoryColor}`}>
          {initial}
        </div>

        {/* Name & Role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-secondary-900 truncate">{contact.name}</h3>
            {contact.isEmergency && <Star className="w-4 h-4 text-red-500 fill-red-500 flex-shrink-0" />}
          </div>
          <p className="text-sm text-secondary-500">{contact.role}</p>
        </div>

        {/* Call Button */}
        <a
          href={`tel:${contact.phone}`}
          className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-500 text-white hover:bg-primary-600 transition-colors flex-shrink-0"
        >
          <Phone className="w-5 h-5" />
        </a>

        {/* Expand */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-2 text-secondary-400 hover:text-secondary-600"
        >
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 pt-3 border-t border-border space-y-2">
          <div className="flex items-center gap-2 text-sm text-secondary-600">
            <Phone className="w-4 h-4 text-secondary-400" />
            <a href={`tel:${contact.phone}`} className="text-primary-600 hover:underline">{contact.phone}</a>
          </div>
          {contact.phone2 && (
            <div className="flex items-center gap-2 text-sm text-secondary-600">
              <Phone className="w-4 h-4 text-secondary-400" />
              <a href={`tel:${contact.phone2}`} className="text-primary-600 hover:underline">{contact.phone2}</a>
            </div>
          )}
          {contact.email && (
            <div className="flex items-center gap-2 text-sm text-secondary-600">
              <Mail className="w-4 h-4 text-secondary-400" />
              <a href={`mailto:${contact.email}`} className="text-primary-600 hover:underline">{contact.email}</a>
            </div>
          )}
          {contact.address && (
            <div className="flex items-center gap-2 text-sm text-secondary-600">
              <MapPin className="w-4 h-4 text-secondary-400" />
              <span>{contact.address}</span>
            </div>
          )}
          {contact.hours && (
            <div className="flex items-center gap-2 text-sm text-secondary-600">
              <Clock className="w-4 h-4 text-secondary-400" />
              <span>{contact.hours}</span>
            </div>
          )}
          {contact.notes && (
            <p className="text-sm text-secondary-500 mt-2 pl-6">{contact.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}
