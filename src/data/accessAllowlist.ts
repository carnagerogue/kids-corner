// ---------------------------------------------------------------------------
// Approved grown-ups. Only these Google accounts may CREATE a family (existing
// members of a family always keep access).
//
// EMPTY = open — anyone with Google can create a family. That's intentional for
// initial setup so the owner isn't locked out before adding themselves. Once
// you list emails here, only those grown-ups can create families.
//
// This is a client-side gate for the trusted-families launch. The robust,
// rules-enforced + admin-managed version (so you can add families without a
// redeploy) is a Phase 2 item.
// ---------------------------------------------------------------------------

export const ALLOWED_PARENT_EMAILS: string[] = [
  // "you@gmail.com",
  // "grandma@gmail.com",
];

export function isAllowedParent(email: string | null | undefined): boolean {
  if (ALLOWED_PARENT_EMAILS.length === 0) return true; // open until configured
  if (!email) return false;
  const e = email.toLowerCase();
  return ALLOWED_PARENT_EMAILS.some((a) => a.toLowerCase() === e);
}
