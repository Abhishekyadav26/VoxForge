# C1-B Restructure — chrome component pass

Change: introduce a `SiteNav` component with designed 32px nav targets, a `ComposerBar` with 44px touch rows (chips become a 2×2 grid on mobile), and a `HelperText` component fixed at 12px/slate-300. Moves emphasis out of ad-hoc classes into three components.
Before/after: same visuals, but every chrome touchpoint is a component with a size contract.
Files: new `components/SiteNav.tsx`, restyle composer in `app/studio/page.tsx`, replace helpers. Effort: M. Risk: more files touched; view-transition header interplay.
Meets C1: same as A, plus durable contracts ✓.
