/** Bump when the Terms or Privacy Policy change in a way people should agree to again. */
export const LEGAL_VERSION = "2026-11-21";
export const LEGAL_UPDATED = "21 November 2026";

export type LegalSettings = {
  business: string;
  email: string;
  grievanceName: string;
  city: string;
};

export const DEFAULT_LEGAL: LegalSettings = { business: "PERSONA 90", email: "", grievanceName: "", city: "India" };

export const isEmail = (s: string) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(s);
