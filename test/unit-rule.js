// The unit lint's rule (a helper, not a test file): shared by test/units.test.js, and mutated by tools/mutations.mjs
// (rows for 'test/unit-rule.js') so the tests of the rule itself are shown to fail when the rule is broken.
// A number: optional sign (U+2212 or hyphen-minus), digits with optional decimals, or '.5'. A full stop after
// digits ends a sentence ('→ 0.'), it is not a decimal point. An exponent belongs to its number: fmt prints a
// pasted 1e60 as '1e+60' (a long-standing quirk of Number.toFixed beyond 1e21), and the unit follows the whole token.
// Its unit: optionally one space, then N/m, N or m as a whole word (so "4 metre" is NOT a unit).
// The space between a number and its unit must be a NO-BREAK SPACE (U+00A0), so a line break can never
// separate them: a plain space there is its own offence (the 'plain' list), checked by every source.
export const NUMBER = /[−-]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?/g;
export const NBSP = '\u00a0';
export const UNIT_AFTER = /^[ \u00a0]?(?:N\/m|N|m)(?![A-Za-z0-9\/])/;


// Returns the numbers in `str` that are not followed by a unit.
export function bareNumbers(str) {
  const bad = [];
  for (const m of str.matchAll(NUMBER)) {
    const after = str.slice(m.index + m[0].length);
    if (!UNIT_AFTER.test(after)) bad.push(`${m[0]} in "${str}"`);
  }
  return bad;
}

// Returns the numbers whose unit follows a PLAIN space (a line break could fall between them).
export function plainSpaceNumbers(str) {
  const bad = [];
  for (const m of str.matchAll(NUMBER)) {
    const after = str.slice(m.index + m[0].length);
    if (UNIT_AFTER.test(after) && after.startsWith(' ')) bad.push(`${m[0]} in "${str}"`);
  }
  return bad;
}
