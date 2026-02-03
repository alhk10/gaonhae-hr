

# Implementation Plan: Inventory List and Inventory Order Form Tabs

## Overview

Add two new tabs to the Product Management page:
1. **Inventory List** - Displays all product stock levels across all branches
2. **Inventory Order Form** - Purchase order workflow with superadmin approval that updates inventory using average cost pricing

---

## What Will Be Built

### Tab 1: Inventory List
A comprehensive view showing:
- Product name, SKU, and category
- Stock levels at each branch/location
- Total stock across all locations
- Stock status indicators (in stock, low stock, out of stock)
- Cost per unit
- Filtering by product, branch, and stock status
- Export capability

### Tab 2: Inventory Order Form
A purchase order system including:
- Form to create purchase orders for products
- Select product, branch, quantity, and unit cost
- Submit orders for superadmin approval
- View order history with status tracking
- On approval: automatically add quantity to inventory and recalculate average cost

---

## Technical Details

### Database Changes

**New Table: `inventory_orders`**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| order_number | text | Auto-generated order reference |
| product_id | uuid | References products table |
| location_id | uuid | References inventory_locations table |
| size_variant | text | Optional size variant |
| quantity | integer | Quantity to purchase |
| unit_cost | numeric | Cost per unit for this order |
| total_cost | numeric | Calculated total |
| status | text | pending, approved, rejected, received |
| notes | text | Order notes |
| requested_by | text | Employee ID who created |
| requested_by_email | text | Email of requester |
| approved_by | text | Superadmin email |
| approved_at | timestamptz | When approved |
| received_at | timestamptz | When received into inventory |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Last update |

### New Files

1. **`src/components/sales/InventoryListTab.tsx`**
   - Component displaying inventory across all branches
   - Table with product, location, quantity, cost, status
   - Filters for branch, category, stock status
   - Search functionality

2. **`src/components/sales/InventoryOrderFormTab.tsx`**
   - Tab container for order management
   - Create new order form
   - Order history list

3. **`src/components/sales/CreateInventoryOrderDialog.tsx`**
   - Dialog for creating new purchase orders
   - Product selector (searchable)
   - Branch/location selector
   - Quantity and unit cost inputs
   - Size variant selector (if applicable)

4. **`src/components/sales/InventoryOrderList.tsx`**
   - List of orders with status badges
   - Filters by status (pending, approved, rejected, received)
   - Approval actions for superadmins

5. **`src/components/dashboard/InventoryOrderApprovals.tsx`**
   - Dashboard component for superadmins
   - Shows pending orders requiring approval
   - Approve/reject actions

6. **`src/services/inventoryOrderService.ts`**
   - Service functions for:
     - Creating orders
     - Fetching orders (all, pending, by user)
     - Approving orders (with average cost calculation)
     - Rejecting orders
     - Marking orders as received

### Modified Files

1. **`src/pages/sales/ProductManagement.tsx`**
   - Add Tabs component for tabbed navigation
   - Tab 1: Products (existing ProductManagementList + ProductCategoriesManager)
   - Tab 2: Inventory List (new)
   - Tab 3: Inventory Orders (new)

2. **`src/services/inventoryService.ts`**
   - Add function to update inventory with average cost calculation
   - `updateInventoryWithAverageCost(productId, locationId, quantity, unitCost, sizeVariant?)`

3. **`src/integrations/supabase/types.ts`**
   - Types will be auto-regenerated after migration

4. **`src/components/dashboard/SuperadminDashboard.tsx`**
   - Add InventoryOrderApprovals component to dashboard

### Average Cost Calculation

When an order is approved and received:

```text
New Average Cost = 
  (Existing Quantity × Existing Cost + Order Quantity × Order Cost) 
  ÷ (Existing Quantity + Order Quantity)
```

This ensures inventory valuation remains accurate as new stock arrives at different prices.

---

## User Flow

### Creating a Purchase Order
1. User navigates to Product Management → Inventory Orders tab
2. Clicks "Create Order" button
3. Selects product, branch, quantity, and enters unit cost
4. Submits order (status: "pending")
5. Toast notification confirms submission

### Approving an Order (Superadmin)
1. Superadmin sees pending orders in dashboard or Inventory Orders tab
2. Reviews order details (product, quantity, cost)
3. Clicks Approve or Reject
4. On Approve:
   - Status changes to "approved"
   - Inventory quantity increases
   - Cost per unit recalculated using average cost model
   - Movement recorded in inventory_movements table

### Viewing Inventory
1. Navigate to Product Management → Inventory List tab
2. View all products with stock levels per branch
3. Use filters to find specific items or low-stock products

---

## Implementation Steps

1. Create database migration for `inventory_orders` table
2. Create inventory order service with CRUD operations
3. Build InventoryListTab component
4. Build CreateInventoryOrderDialog component
5. Build InventoryOrderFormTab with order list
6. Build InventoryOrderApprovals dashboard component
7. Update ProductManagement page with tabs
8. Add average cost calculation logic
9. Update SuperadminDashboard with approval widget
10. Update Supabase types

---

## Component Structure

```text
ProductManagement.tsx
├── Tabs
│   ├── Tab: Products
│   │   ├── ProductManagementList
│   │   └── ProductCategoriesManager
│   ├── Tab: Inventory List
│   │   └── InventoryListTab
│   └── Tab: Inventory Orders
│       └── InventoryOrderFormTab
│           ├── CreateInventoryOrderDialog (trigger)
│           └── InventoryOrderList
│               └── (Approval actions for superadmin)

SuperadminDashboard.tsx
├── ... existing components ...
└── InventoryOrderApprovals
```

