const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

// Mock MagicMirror globals for testing the module code
let registeredModule = null;
global.Module = {
  register: function (name, definition) {
    registeredModule = definition;
  }
};
global.Log = {
  info: function () {},
  error: function () {},
  warn: function () {}
};

// Load the module script
const modulePath = path.join(__dirname, "../MMM-OverlayEffects.js");
const moduleCode = fs.readFileSync(modulePath, "utf8");
eval(moduleCode);

console.log("Testing MMM-OverlayEffects...\n");

assert(registeredModule, "Module must be registered via Module.register");

// Mirrors MagicMirror: a shallow merge of user config over defaults, followed
// by the module's own deep merge in start()
function createInstance(configOverrides = {}) {
  const instance = Object.create(registeredModule);
  instance.name = "MMM-OverlayEffects";
  instance.config = Object.assign({}, registeredModule.defaults, configOverrides);
  instance.applyConfigDefaults();
  return instance;
}

// 1. Test Thanksgiving calculations
console.log("1. Testing Thanksgiving Calculations");
const testInstance = createInstance();
assert.strictEqual(testInstance.getUSThanksgiving(2024), 28, "2024 Thanksgiving is Nov 28");
assert.strictEqual(testInstance.getUSThanksgiving(2025), 27, "2025 Thanksgiving is Nov 27");
assert.strictEqual(testInstance.getUSThanksgiving(2026), 26, "2026 Thanksgiving is Nov 26");
assert.strictEqual(testInstance.getUSThanksgiving(2027), 25, "2027 Thanksgiving is Nov 25");
assert.strictEqual(testInstance.getCanadianThanksgiving(2024), 14, "2024 Canadian Thanksgiving is Oct 14");
assert.strictEqual(testInstance.getCanadianThanksgiving(2025), 13, "2025 Canadian Thanksgiving is Oct 13");
assert.strictEqual(testInstance.getCanadianThanksgiving(2026), 12, "2026 Canadian Thanksgiving is Oct 12");
console.log("  ✓ US & Canadian Thanksgiving date formulas verified\n");

// 2. Test All Required Holiday Dates
console.log("2. Testing Holiday Date Detection Rules");
const testCases = [
  // October = spider webs
  { date: "2026-10-01", expected: "spiderwebs", desc: "Oct 1 (Spider webs start)" },
  { date: "2026-10-15", expected: "spiderwebs", desc: "Oct 15 (Mid October)" },
  { date: "2026-10-31", expected: "spiderwebs", desc: "Oct 31 (Halloween)" },

  // December = snow (normal days)
  { date: "2026-12-01", expected: "snow", desc: "Dec 1 (Snow starts)" },
  { date: "2026-12-15", expected: "snow", desc: "Dec 15 (December snow)" },
  { date: "2026-12-23", expected: "snow", desc: "Dec 23 (Before Christmas Eve)" },

  // Christmas Eve / Day = falling Santas
  { date: "2026-12-24", expected: "santas", desc: "Dec 24 (Christmas Eve Santas)" },
  { date: "2026-12-25", expected: "santas", desc: "Dec 25 (Christmas Day Santas)" },

  // December 26-30 = snow resumes
  { date: "2026-12-26", expected: "snow", desc: "Dec 26 (Boxing Day snow)" },
  { date: "2026-12-30", expected: "snow", desc: "Dec 30 (December snow)" },

  // New Year's Eve / Day = confetti
  { date: "2026-12-31", expected: "confetti", desc: "Dec 31 (New Year's Eve Confetti)" },
  { date: "2026-01-01", expected: "confetti", desc: "Jan 1 (New Year's Day Confetti)" },

  // Non-holiday day in January
  { date: "2026-01-02", expected: null, desc: "Jan 2 (No holiday)" },

  // Feb 14 = hearts, heart eyes emojis
  { date: "2026-02-13", expected: null, desc: "Feb 13 (Day before Valentine's)" },
  { date: "2026-02-14", expected: "hearts", desc: "Feb 14 (Valentine's Day Hearts)" },
  { date: "2026-02-15", expected: null, desc: "Feb 15 (Day after Valentine's)" },

  // St. Patrick's Day = Falling 3- and 4-leaf green clovers emojis
  { date: "2026-03-16", expected: null, desc: "March 16 (Day before St. Patrick's)" },
  { date: "2026-03-17", expected: "clovers", desc: "March 17 (St. Patrick's Day Clovers)" },
  { date: "2026-03-18", expected: null, desc: "March 18 (Day after St. Patrick's)" },

  // April Fools' Day = mirrored screen
  { date: "2026-03-31", expected: null, desc: "March 31 (Day before April Fools')" },
  { date: "2026-04-01", expected: "mirrored", desc: "April 1 (April Fools' Mirrored Screen)" },
  { date: "2026-04-02", expected: null, desc: "April 2 (Day after April Fools')" },

  // July 1-4 = fireworks
  { date: "2026-06-30", expected: null, desc: "June 30 (Day before Fireworks)" },
  { date: "2026-07-01", expected: "fireworks", desc: "July 1 (Fireworks Day 1)" },
  { date: "2026-07-02", expected: "fireworks", desc: "July 2 (Fireworks Day 2)" },
  { date: "2026-07-03", expected: "fireworks", desc: "July 3 (Fireworks Day 3)" },
  { date: "2026-07-04", expected: "fireworks", desc: "July 4 (Fireworks Day 4, Independence Day)" },
  { date: "2026-07-05", expected: null, desc: "July 5 (Day after Fireworks)" },

  // Thanksgiving = falling turkey emojis (Nov 26 in 2026)
  { date: "2026-11-25", expected: null, desc: "Nov 25 (Day before Thanksgiving)" },
  { date: "2026-11-26", expected: "turkeys", desc: "Nov 26 (Thanksgiving Day Turkeys)" },
  { date: "2026-11-27", expected: null, desc: "Nov 27 (Day after Thanksgiving)" }
];

for (const tc of testCases) {
  const inst = createInstance({ testDate: tc.date });
  const actual = inst.determineActiveEffect();
  assert.strictEqual(actual, tc.expected, `Failed for ${tc.desc}: expected ${tc.expected}, got ${actual}`);
  console.log(`  ✓ ${tc.desc}: got ${actual}`);
}
console.log();

// 3. Test Canadian Thanksgiving
console.log("3. Testing Canadian Thanksgiving Config");
const canInst = createInstance({
  testDate: "2026-10-12",
  turkeys: { thanksgivingType: "canadian" }
});
assert.strictEqual(canInst.determineActiveEffect(), "turkeys", "Canadian Thanksgiving on 2nd Monday Oct triggers turkeys");
console.log("  ✓ Canadian Thanksgiving correctly triggers turkeys on 2nd Monday of October\n");

// 4. Test Force Effect
console.log("4. Testing Force Effect Override");
const forceInst = createInstance({
  testDate: "2026-05-15", // normally no holiday
  forceEffect: "fireworks"
});
assert.strictEqual(forceInst.determineActiveEffect(), "fireworks", "forceEffect overrides date");
console.log("  ✓ forceEffect correctly overrides date\n");

// 5. Test Enabled / Disabled Toggles
console.log("5. Testing Enabled Effects Toggles");
const disabledInst = createInstance({
  testDate: "2026-12-15", // normally snow
  enabledEffects: {
    snow: false
  }
});
assert.strictEqual(disabledInst.determineActiveEffect(), null, "Disabled effect returns null");
const otherEnabledInst = createInstance({ testDate: "2026-02-14", enabledEffects: { snow: false } });
assert.strictEqual(otherEnabledInst.determineActiveEffect(), "hearts", "Disabling one effect keeps the others enabled");
console.log("  ✓ Disabling an effect prevents it from activating, other effects stay enabled\n");

// 6. Test Custom Schedules
console.log("6. Testing Custom Schedules");
const customInst = createInstance({
  testDate: "2026-05-20",
  customSchedules: [
    { name: "MySpecialEvent", month: 5, day: 20, effect: "confetti" }
  ]
});
assert.strictEqual(customInst.determineActiveEffect(), "confetti", "customSchedules triggers correctly");
console.log("  ✓ Custom schedule correctly triggers specified effect\n");

// 7. Test SVG Web & Spider Generation
console.log("7. Testing SVG Web and Spider Generation");
const webSvg = testInstance.generateCornerWebSvg(320, "rgba(255,255,255,0.45)");
assert(webSvg.includes("<svg"), "Must contain svg opening tag");
assert(webSvg.includes("</svg>"), "Must contain svg closing tag");
assert(webSvg.includes('viewBox="0 0 320 320"'), "Must contain correct viewBox");

const spiderSvg = testInstance.generateSpiderSvg();
assert(spiderSvg.includes("<svg"), "Must contain spider svg tag");
assert(spiderSvg.includes("line"), "Must contain spider silk line");
console.log("  ✓ SVG generators output valid, properly formatted SVG\n");

// 8. Partial nested config keeps the remaining defaults
console.log("8. Testing Partial Nested Config Merge");
const partialInst = createInstance({ snow: { count: 50 }, turkeys: { thanksgivingType: "canadian" } });
assert.strictEqual(partialInst.config.snow.count, 50, "Override applied");
assert.strictEqual(partialInst.config.snow.speedMin, 0.8, "Missing nested keys fall back to defaults");
assert.deepStrictEqual(partialInst.config.turkeys.emojis, ["🦃"], "Emoji list kept");
assert.deepStrictEqual(registeredModule.defaults.snow.count, 90, "Defaults are not mutated");
console.log("  ✓ Partial nested objects merge with defaults\n");

// 9. Canadian Thanksgiving long weekend (Sat-Mon)
console.log("9. Testing Canadian Thanksgiving Weekend");
const canWeekend = { thanksgivingType: "canadian", thanksgivingIncludeWeekend: true };
assert.strictEqual(createInstance({ testDate: "2026-10-10", turkeys: canWeekend }).determineActiveEffect(), "turkeys", "Saturday");
assert.strictEqual(createInstance({ testDate: "2026-10-12", turkeys: canWeekend }).determineActiveEffect(), "turkeys", "Monday");
assert.strictEqual(createInstance({ testDate: "2026-10-13", turkeys: canWeekend }).determineActiveEffect(), "spiderwebs", "Tuesday after");
console.log("  ✓ Canadian long weekend runs Saturday through Monday\n");

// 10. Unknown effect names are ignored
console.log("10. Testing Unknown Effect Names");
assert.strictEqual(createInstance({ forceEffect: "rain" }).determineActiveEffect(), null, "Invalid forceEffect");
assert.strictEqual(createInstance({
  testDate: "2026-05-20",
  customSchedules: [{ month: 5, day: 20, effect: "rain" }]
}).determineActiveEffect(), null, "Invalid custom schedule effect");
console.log("  ✓ Unknown effects are rejected\n");

// 11. Notification overrides survive date checks
console.log("11. Testing Notification Overrides");
const notifyInst = createInstance({ testDate: "2026-12-15" });
notifyInst.override = null;
notifyInst.updateDom = function () {};
notifyInst.currentEffect = notifyInst.resolveEffect();
notifyInst.notificationReceived("OVERLAY_EFFECT_SET", { effect: "fireworks" });
notifyInst.refreshEffect();
assert.strictEqual(notifyInst.currentEffect, "fireworks", "SET survives a date check");
notifyInst.notificationReceived("OVERLAY_EFFECT_SET", { effect: "rain" });
assert.strictEqual(notifyInst.currentEffect, "fireworks", "Invalid SET is ignored");
notifyInst.notificationReceived("OVERLAY_EFFECT_TOGGLE");
notifyInst.refreshEffect();
assert.strictEqual(notifyInst.currentEffect, null, "Toggle off survives a date check");
notifyInst.notificationReceived("OVERLAY_EFFECT_TOGGLE");
assert.strictEqual(notifyInst.currentEffect, "snow", "Toggle on returns to the schedule");
notifyInst.notificationReceived("OVERLAY_EFFECT_SET", { effect: "hearts" });
notifyInst.notificationReceived("OVERLAY_EFFECT_RESET");
assert.strictEqual(notifyInst.currentEffect, "snow", "Reset returns to the schedule");
console.log("  ✓ SET / TOGGLE / RESET behave correctly\n");

console.log("ALL TESTS PASSED! 🎉");
