## Competitions tab: Branch filter + Print PDF

Scope: `src/pages/public/PublicGradingList.tsx` Competitions tab only.

### 1. Branch filter dropdown
- Add a `Select` next to the existing competition (event) filter dropdown.
- Options: `All branches` (default) + every branch present in the currently loaded competition rows (derived list, sorted alphabetically).
- State: `const [branchFilter, setBranchFilter] = useState<string>('all')`.
- Apply filter client-side to the rows already rendered (after the existing event filter), so it composes with other filters/search.

### 2. Print PDF button
- Add a `Button` (Printer icon, `size="sm"`, `variant="outline"`) next to the Events button in the Competitions header.
- Click → generate PDF of currently-visible rows (respects event + branch + search filters).
- Use `jsPDF` (already in deps, per `gradingPrepPDFGenerator.ts`). Create new util `src/utils/competitionPrintPDFGenerator.ts` modeled on `gradingPrepPDFGenerator.ts`.

**PDF columns (in this order):**
| # | Branch | Name | Belt | Category | Poomsae 1 | P1 Score | Poomsae 2 | P2 Score | Remarks |

- Name uppercase, A4 landscape (9 columns need width), score/remarks columns blank for manual marking.
- Title: `Competition Scoring – {event name}` (or `All events` if none selected); subtitle: `Branch: {filter or All}`, generated date, total count.
- Filename: `Competition_{event}_{branch}.pdf`.

### Out of scope
- No changes to Seminars/Grading/Guards tabs.
- No backend/schema changes.
- No changes to edit/verify/reject actions.
