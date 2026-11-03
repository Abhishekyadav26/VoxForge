# C1-C Convention — adopt the shadcn contract

Change: what best-in-class shadcn apps do: use `Button size="sm"` (h-8/32px) for all chrome actions, `text-sm` minimum for helper prose, `text-muted-foreground` only for ≥4.5:1 pairs. Replace raw `<button>`/`<a>` chrome with `Button asChild` + `size="sm"`.
Files: `app/layout.tsx`, `app/studio/page.tsx`, `app/agents/[id]/page.tsx`, `components/ui/button.tsx` (verify h-8). Effort: M. Risk: button styles shift header look slightly.
Meets C1: targets become 32px ✓, contrast via token discipline ✓.
