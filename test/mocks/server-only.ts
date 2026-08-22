// Real "server-only" throws unless the RSC bundler condition is active,
// which plain Node/vitest doesn't set. Tests alias the package to this
// no-op so server-only modules can still be imported and tested directly.
export {};
