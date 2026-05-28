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
import { template as guardsOrderReceived } from './guards-order-received.tsx'
import { template as guardsCollected } from './guards-collected.tsx'
import { template as seminarConfirmation } from './seminar-confirmation.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'grading-confirmation': gradingConfirmation,
  'hello-callback-request': helloCallbackRequest,
  'guards-order-received': guardsOrderReceived,
  'guards-collected': guardsCollected,
  'seminar-confirmation': seminarConfirmation,
}
