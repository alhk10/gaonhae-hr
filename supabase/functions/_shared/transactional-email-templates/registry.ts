/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as gradingConfirmation } from './grading-confirmation.tsx'
import { template as helloCallbackRequest } from './hello-callback-request.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'grading-confirmation': gradingConfirmation,
  'hello-callback-request': helloCallbackRequest,
}
