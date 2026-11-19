/**
 * The Play Store app is a Trusted Web Activity: Android opens this website full
 * screen, with no browser bar, once the site vouches for the app in
 * /.well-known/assetlinks.json. That file lists the app's package name and the
 * SHA-256 fingerprints of the keys that sign it: the upload key below, plus
 * Google's app-signing key, which an admin adds from Play Console.
 */
export const ANDROID_PACKAGE = "in.persona90.app";
export const UPLOAD_KEY_SHA256 = "07:DE:7E:7F:39:3B:81:DB:98:BE:5E:62:EB:69:55:FE:65:D7:04:D0:AF:AC:8C:0B:BD:57:FE:76:B8:C7:C4:9B";

export const isFingerprint = (s: string) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(s.trim().toUpperCase());
