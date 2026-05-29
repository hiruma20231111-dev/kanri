export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  location?: string
  attendees?: { email: string; displayName?: string }[]
}

export interface MeetingInsight {
  companyName: string
  companyOverview: string
  recommendedProducts: string[]
  salesAdvice: string
  keyPoints: string[]
  driveFiles: DriveFile[]
}

export interface DriveFile {
  id: string
  name: string
  webViewLink: string
  mimeType: string
  modifiedTime: string
}

export interface GmailMessage {
  id: string
  threadId: string
  subject: string
  from: string
  fromName: string
  date: string
  snippet: string
  body: string
  isRead: boolean
}

export interface EmailInsight {
  summary: string
  category: string
  priority: 'high' | 'medium' | 'low'
  replyDraft: string
  requiredAction: string
}

export interface Customer {
  id: string
  companyName: string
  contactName: string
  email: string
  phone: string
  address?: string
  services: string[]
  status: 'active' | 'prospect' | 'inactive'
  notes?: string
  lastContact?: string
  nextAction?: string
}

export interface SessionWithToken {
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  accessToken?: string
  expires: string
}
