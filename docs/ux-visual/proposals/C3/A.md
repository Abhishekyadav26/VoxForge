# C3-A Minimal — friendly register error

Change: in `app/api/auth/register` (or the login page catch), map the Zod `name` too_small error to "Please enter your name". One error-map, one file.
Files: login page + register route. Effort: XS. Risk: none.
Meets C3 error half ✓.
