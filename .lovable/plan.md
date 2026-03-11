

## Plan: Remove PII and Sensitive Data from Console Logs

### Problem
Employee names (Wang Pot Chien, Siti Aisyah, Ryan Goh), NRIC numbers, bank details, and the word "payroll" are being logged to the browser console. This is a security risk — any user can open DevTools and see this data.

### Changes

**1. `src/contexts/PayrollContext.tsx`** — Remove all debug logging that exposes PII:
- Remove lines 600, 603-610 (DB data debug logs with names/emails)
- Remove lines 687-698 (processed employee names/emails logs)  
- Remove lines 888-904 (Wang Pot Chien attendance debug block)
- Remove lines 960, 969, 983 (Wang Pot Chien manual-add logs)
- Replace remaining `console.log` calls with `logger.debug()` using only counts/IDs, never names or emails

**2. `src/utils/payrollWorkarounds.ts`** — Remove hardcoded PII:
- Remove the `MISSING_EMPLOYEES_WORKAROUND` array containing names, NRICs, and bank accounts
- Remove the `shouldApplyWorkaround` function that references names
- Keep only generic utility functions (`getPeriodDates`, `getAttendanceDataForMissingEmployees`) but reference employee IDs only, not names

**3. `src/utils/payrollCalculations.ts`** — Sanitize logs:
- Replace `console.log` statements that include `employee.name` with ID-only references
- Convert verbose period-checking logs to `logger.debug()`

**4. `src/services/slotBookingPayrollService.ts`** — Reduce logging:
- Remove or convert detailed pay calculation logs to `logger.debug()`

**5. General sweep** — across files found in search (16 files):
- Replace `console.log` containing employee names/emails with `logger.debug()` using IDs only
- Remove any hardcoded name references used for debugging

### Approach
- Use the existing `src/utils/logger.ts` which already suppresses `debug` level in production
- In development, logs will show employee IDs only (e.g., `"Employee EMP175... loaded"`) — never names, NRICs, or bank details
- The hardcoded workaround data in PayrollContext (lines 556-592) with names/NRICs/bank accounts will also be removed since the comment on line 595 already says it's disabled

