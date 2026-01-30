
# Plan: Enhance Invoice & Payment Management System

## Overview
This plan addresses three main requirements:
1. **Fix non-working View and Edit action buttons** for invoices and payments
2. **Add Invoice Template tab and functionality** to manage invoice templates
3. **Consolidate Invoices and Payments** into a tabbed interface with template management

## Current Issues Analysis

### Problem 1: Non-Working View/Edit Buttons
In `InvoiceManagementList.tsx` (lines 365-386) and `PaymentManagementList.tsx` (lines 341-358), the View and Edit buttons have `disabled` attribute set:
```typescript
<Button disabled> // View button
<Button disabled={!canEdit(invoice.branch_id || '')}> // Edit button - only permission check, no onClick
```
These buttons have no click handlers and are intentionally disabled.

### Problem 2: No Invoice Template System
The system currently has no `invoice_templates` table or template management functionality. The `letter_templates` table exists for HR letters but not for invoices.

### Problem 3: Separate Invoice and Payment Pages
Currently, invoices (`/sales/invoices`) and payments (`/sales/payments`) are on separate pages.

---

## Implementation Plan

### Phase 1: Database Schema (Invoice Templates)

Create `invoice_templates` table to store reusable invoice templates:

**Table: invoice_templates**
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | TEXT | Template name |
| description | TEXT | Optional description |
| default_payment_terms_days | INTEGER | Default payment terms |
| default_notes | TEXT | Default invoice notes |
| default_internal_notes | TEXT | Default internal notes |
| category_items | JSONB | Pre-configured items (category_id, product_id, qty) |
| is_active | BOOLEAN | Whether template is active |
| branch_id | TEXT | Optional branch restriction |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Update timestamp |

### Phase 2: Create View/Edit Invoice Dialog

**New File: `src/components/sales/ViewEditInvoiceDialog.tsx`**

A dialog component that:
- Displays full invoice details including all items
- Shows payment history for the invoice
- Allows editing invoice notes, internal notes, due date
- Allows status changes via dropdown
- Shows read-only fields (totals, amounts) clearly
- Has "Record Payment" quick action button

Key features:
- View mode: All fields read-only with nice formatting
- Edit mode: Enable editing allowed fields
- Modal with tabs: Details | Items | Payments | History

### Phase 3: Create View/Edit Payment Dialog

**New File: `src/components/sales/ViewEditPaymentDialog.tsx`**

A dialog component that:
- Displays full payment details
- Shows linked invoice information
- Allows editing notes, reference number, payment method
- Shows proof of payment if available

### Phase 4: Create Invoice Template Management

**New Files:**
- `src/components/sales/InvoiceTemplateList.tsx` - List and manage templates
- `src/components/sales/CreateEditInvoiceTemplateDialog.tsx` - Create/edit templates
- `src/services/invoiceTemplateService.ts` - CRUD operations for templates

Features:
- List all templates with filters
- Create new template with default items
- Edit existing templates
- Delete templates
- Apply template when creating invoice (populate items automatically)

### Phase 5: Consolidated Invoice & Payments Page

**Modified File: `src/pages/sales/InvoiceManagement.tsx`**

Convert to tabbed interface with three tabs:
1. **Invoices** - Current invoice list functionality
2. **Payments** - Current payment list functionality  
3. **Templates** - Invoice template management

Structure:
```tsx
<Tabs defaultValue="invoices">
  <TabsList>
    <TabsTrigger value="invoices">Invoices</TabsTrigger>
    <TabsTrigger value="payments">Payments</TabsTrigger>
    <TabsTrigger value="templates">Templates</TabsTrigger>
  </TabsList>
  <TabsContent value="invoices">
    <InvoiceManagementList />
  </TabsContent>
  <TabsContent value="payments">
    <PaymentManagementList />
  </TabsContent>
  <TabsContent value="templates">
    <InvoiceTemplateList />
  </TabsContent>
</Tabs>
```

### Phase 6: Update InvoiceManagementList

**Modified File: `src/components/sales/InvoiceManagementList.tsx`**

Changes:
- Wire up View button to open `ViewEditInvoiceDialog` in view mode
- Wire up Edit button to open `ViewEditInvoiceDialog` in edit mode
- Add "Record Payment" action button for unpaid invoices
- Remove `disabled` attributes and add proper onClick handlers

### Phase 7: Update PaymentManagementList

**Modified File: `src/components/sales/PaymentManagementList.tsx`**

Changes:
- Wire up View button to open `ViewEditPaymentDialog` in view mode
- Wire up Edit button to open `ViewEditPaymentDialog` in edit mode
- Remove `disabled` attributes and add proper onClick handlers

### Phase 8: Update CreateInvoiceDialog

**Modified File: `src/components/sales/CreateInvoiceDialog.tsx`**

Add template selection:
- Add "Apply Template" dropdown at top of form
- When template selected, populate items and default values
- Add "Save as Template" option after creating invoice

---

## Technical Details

### Invoice Service Updates
Add to `src/services/invoiceService.ts`:
```typescript
// Update invoice (notes, dates, etc.)
export const updateInvoice = async (
  invoiceId: string,
  updates: Partial<Pick<Invoice, 'notes' | 'internal_notes' | 'due_date' | 'payment_terms_days'>>
): Promise<Invoice>

// Add invoice items (for editing)
export const addInvoiceItem = async (invoiceId: string, item: NewInvoiceItem)

// Remove invoice item
export const removeInvoiceItem = async (itemId: string)
```

### Invoice Template Service
Create `src/services/invoiceTemplateService.ts`:
```typescript
export interface InvoiceTemplate {
  id: string;
  name: string;
  description?: string;
  default_payment_terms_days: number;
  default_notes?: string;
  default_internal_notes?: string;
  category_items: Array<{
    category_id: string;
    product_id?: string;
    quantity?: number;
    unit_price?: number;
  }>;
  is_active: boolean;
  branch_id?: string;
}

export const getTemplates = async (): Promise<InvoiceTemplate[]>
export const createTemplate = async (data: CreateTemplateData): Promise<InvoiceTemplate>
export const updateTemplate = async (id: string, data: UpdateTemplateData): Promise<InvoiceTemplate>
export const deleteTemplate = async (id: string): Promise<void>
```

### Payment Service Updates
Add to `src/services/paymentService.ts`:
```typescript
// Already exists: updatePayment - just need to use it in UI
```

---

## File Changes Summary

### New Files (7)
1. `src/components/sales/ViewEditInvoiceDialog.tsx`
2. `src/components/sales/ViewEditPaymentDialog.tsx`
3. `src/components/sales/InvoiceTemplateList.tsx`
4. `src/components/sales/CreateEditInvoiceTemplateDialog.tsx`
5. `src/services/invoiceTemplateService.ts`

### Modified Files (5)
1. `src/pages/sales/InvoiceManagement.tsx` - Add tabs for Invoices/Payments/Templates
2. `src/components/sales/InvoiceManagementList.tsx` - Wire up View/Edit buttons
3. `src/components/sales/PaymentManagementList.tsx` - Wire up View/Edit buttons
4. `src/components/sales/CreateInvoiceDialog.tsx` - Add template selection
5. `src/services/invoiceService.ts` - Add updateInvoice function

### Database Migration
1. Create `invoice_templates` table with RLS policies

---

## UI/UX Flow

### View Invoice Flow
1. User clicks Eye icon on invoice row
2. ViewEditInvoiceDialog opens in view mode
3. Shows formatted invoice with items, payments, totals
4. User can click "Edit" to switch to edit mode
5. User can click "Record Payment" to open payment dialog

### Edit Invoice Flow
1. User clicks Edit icon on invoice row (or clicks Edit in view dialog)
2. ViewEditInvoiceDialog opens in edit mode
3. User can modify: notes, internal notes, due date, status
4. User clicks Save to update invoice
5. Changes logged to invoice_change_logs

### Template Management Flow
1. User navigates to Templates tab
2. Sees list of existing templates
3. Can create new template with default items
4. When creating invoice, can select template to pre-fill items

---

## Dependencies and Sequencing

```text
1. Database Migration (invoice_templates table)
   ↓
2. Invoice Template Service
   ↓
3. View/Edit Invoice Dialog + View/Edit Payment Dialog (parallel)
   ↓
4. Update InvoiceManagementList + PaymentManagementList (parallel)
   ↓
5. Invoice Template List Component
   ↓
6. Consolidate into Tabbed Interface
   ↓
7. Update CreateInvoiceDialog with template selection
```

---

## Expected Results

After implementation:
- View button shows full invoice/payment details in a dialog
- Edit button allows modifying allowed fields
- Invoice Templates tab for creating reusable templates
- Payments accessible from same page as invoices
- Streamlined workflow for creating invoices from templates
