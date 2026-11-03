/**
 * Feature flags.
 *
 * Password reset is intentionally disabled for now: Resend requires a
 * verified domain we own, and the reset email cannot be delivered without
 * one. The code is kept intact.
 *
 * Re-enable by setting NEXT_PUBLIC_PASSWORD_RESET_ENABLED=true and
 * configuring RESEND_API_KEY + PASSWORD_RESET_FROM + NEXTAUTH_URL.
 */
export const PASSWORD_RESET_ENABLED =
  process.env.NEXT_PUBLIC_PASSWORD_RESET_ENABLED === "true";
