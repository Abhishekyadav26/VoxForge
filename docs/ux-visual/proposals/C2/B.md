# C2-B Restructure — spec presentation components

Change: build `SpecSummary` (trigger pill + step list with icons + action line) and `RunRow` (relative time, triggered pill, expandable trace) components; detail page becomes summary → RunButton → runs; JSON moves to a "Developer" details block. List cards get status pills.
Before/after ASCII:
```
BEFORE: [title][run btn][{json…}][Runs][raw row]
AFTER:  [title + status pill][what it watches (3 rows)][Run btn][Runs: 2 · last: triggered 5m ago][▸ run row][▸ Developer JSON]
```
Files: new `components/SpecSummary.tsx`, `components/RunRow.tsx`, rewrite detail/list. Effort: M-L. Risk: interpreter-output coupling.
Meets C2 fully ✓, plus scannable runs ✓.
