# Hide "View Pricing Rates" for full-time employees

Slot pricing rates apply to casual staff pay, so full-time employees should not see the shortcut on their dashboard.

## Change

In `src/components/dashboard/EmployeeDashboard.tsx` (Quick Actions, lines ~716-725), wrap the "View Pricing Rates" button in the existing `!isFullTime` condition (`isFullTime = employeeData?.type === 'Full-Time'`, already defined at line 345).

Everyone else (casual, partners) keeps the button, and the dialog itself is unchanged.
