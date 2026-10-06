/**
 * MagicMirror² Module: MMM-OverlayEffects
 *
 * Fullscreen atmospheric and holiday overlay effects:
 * - October: Spider webs in corners with hanging spider, plus a spider that
 *   crawls across the screen every so often
 * - December: Realistic gentle snowfall
 * - July 1-4: Spectacular fireworks
 * - Feb 14: Floating hearts and heart-eyes emojis
 * - New Year’s Eve / Day (Dec 31, Jan 1): Vibrant falling 3D confetti
 * - St. Patrick’s Day (March 17): Falling 3- and 4-leaf green clovers
 * - Thanksgiving: Falling wobbling turkey emojis
 * - Christmas Eve / Day (Dec 24-25): Falling Santas (with optional snow)
 * - April Fools' Day (April 1): The whole mirror is shown flipped horizontally
 *
 * Author: bl8demast3r
 * Written with AI assistance (Claude by Anthropic)
 * License: MIT
 */

// All motion constants are tuned per 60 fps frame; the render loop scales them
// by elapsed time so effects run at the same speed on any refresh rate.
const OVERLAY_FRAME_MS = 1000 / 60;
// Cap a single step (e.g. after a stall) so particles never jump across the screen
const OVERLAY_MAX_STEP = 4;
const OVERLAY_TAU = Math.PI * 2;
const OVERLAY_EFFECTS = ["spiderwebs", "snow", "fireworks", "hearts", "confetti", "clovers", "turkeys", "santas", "mirrored"];
const OVERLAY_EMOJI_FONT = 'px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

Module.register("MMM-OverlayEffects", {
  defaults: {
    // Force a specific effect regardless of date:
    // "spiderwebs" | "snow" | "fireworks" | "hearts" | "confetti" | "clovers" | "turkeys" | "santas" | "mirrored" | null
    forceEffect: null,

    // Test a simulated date: "YYYY-MM-DD" or null
    testDate: null,

    // Fallback interval to re-check the date (a check also runs right after midnight)
    checkInterval: 10 * 60 * 1000,

    // Particle density / intensity: "low" (0.55x), "medium" (1.0x), "high" (1.6x)
    intensity: "medium",

    // Enable or disable individual effects
    enabledEffects: {
      spiderwebs: true,
      snow: true,
      fireworks: true,
      hearts: true,
      confetti: true,
      clovers: true,
      turkeys: true,
      santas: true,
      mirrored: true
    },

    // --- October: Spider Webs Settings ---
    spiderwebs: {
      corners: ["top-left", "top-right"], // ["top-left", "top-right", "bottom-left", "bottom-right"]
      showSpider: true,
      spiderCorner: "top-right", // "top-left" or "top-right"
      webColor: "rgba(255, 255, 255, 0.45)",
      webSize: 320,
      // A spider that wanders across the screen from one edge to the opposite one
      crawlingSpider: true,
      crawlDelayMin: 20000, // ms between crawls (random within this range)
      crawlDelayMax: 60000,
      crawlSpeed: 1.8, // px per frame while moving
      crawlerSize: 44 // px
    },

    // --- December: Snow Settings ---
    snow: {
      count: 90,
      speedMin: 0.8,
      speedMax: 2.2,
      sizeMin: 1.5,
      sizeMax: 4.5,
      wind: 0.3
    },

    // --- July 1-4: Fireworks Settings ---
    fireworks: {
      dates: [1, 2, 3, 4], // days of July (1, 2, 3, 4)
      launchInterval: 1100, // ms between rocket launches
      sparkCount: 65,
      colors: [
        "#FF3366", // bright red
        "#FFFFFF", // white
        "#00D4FF", // cyan / blue
        "#FFD700", // gold
        "#00FF88", // neon green
        "#D154FF", // purple
        "#FF9100"  // orange
      ]
    },

    // --- Feb 14: Hearts Settings ---
    hearts: {
      emojis: ["❤️", "💖", "💕", "💓", "💗", "😍", "🥰", "💘", "💌", "💝"],
      count: 32,
      direction: "up", // "up" (floating) or "down" (falling)
      speedMin: 0.9,
      speedMax: 2.2,
      sizeMin: 22,
      sizeMax: 42
    },

    // --- New Year's Eve / Day: Confetti Settings ---
    confetti: {
      count: 85,
      speedMin: 2.0,
      speedMax: 4.4,
      colors: [
        "#FFD700", // gold
        "#FF4081", // pink
        "#00E5FF", // cyan
        "#76FF03", // lime
        "#FF9100", // orange
        "#E040FB", // violet
        "#FFFFFF"  // white
      ]
    },

    // --- St. Patrick's Day: Clovers Settings ---
    clovers: {
      emojis: ["☘️", "🍀"],
      count: 35,
      speedMin: 1.2,
      speedMax: 2.8,
      sizeMin: 24,
      sizeMax: 44
    },

    // --- Thanksgiving: Turkeys Settings ---
    turkeys: {
      emojis: ["🦃"],
      count: 26,
      speedMin: 1.2,
      speedMax: 2.5,
      sizeMin: 28,
      sizeMax: 46,
      thanksgivingType: "us", // "us" (4th Thursday Nov) or "canadian" (2nd Monday Oct)
      thanksgivingIncludeWeekend: false // US: Thu-Sun, Canadian: Sat-Mon
    },

    // --- Christmas Eve / Day: Santas Settings ---
    santas: {
      emojis: ["🎅", "🤶", "🧑‍🎄"],
      count: 26,
      speedMin: 1.3,
      speedMax: 2.8,
      sizeMin: 28,
      sizeMax: 48,
      combineSnowWithSantas: true // add light snow behind falling Santas
    },

    // Custom schedule overrides
    // e.g. [{ name: "Birthday", month: 5, day: 20, effect: "confetti" }]
    customSchedules: []
  },

  getStyles: function () {
    return ["MMM-OverlayEffects.css"];
  },

  start: function () {
    Log.info("Starting module: " + this.name);
    this.applyConfigDefaults();

    this.currentEffect = null;
    this.override = null; // { effect } set by notifications; survives date checks
    this.overrideTimer = null;
    this.suspended = false;
    this.animationRunning = false;
    this.rafId = null;
    this.lastFrameTime = null;
    this.canvas = null;
    this.ctx = null;
    this.crawlerEl = null;
    this.crawler = null;
    this.crawlTimer = null;
    this.particles = [];
    this.secondaryParticles = [];
    this.rockets = [];
    this.sparks = [];
    this.sparkPool = [];

    this.intensityScale = 1.0;
    if (this.config.intensity === "low") {
      this.intensityScale = 0.55;
    } else if (this.config.intensity === "high") {
      this.intensityScale = 1.6;
    }

    this.currentEffect = this.resolveEffect();

    // Date checks: right after each midnight, plus a periodic fallback
    const self = this;
    this.checkTimer = setInterval(function () {
      self.refreshEffect();
    }, this.config.checkInterval);
    this.scheduleMidnightCheck();

    this.onResize = function () {
      if (self.canvas) {
        self.canvas.width = window.innerWidth;
        self.canvas.height = window.innerHeight;
      }
    };
    window.addEventListener("resize", this.onResize);
  },

  // MagicMirror merges user config with defaults only one level deep, so a
  // partial nested object (e.g. snow: { count: 50 }) would drop the other keys.
  applyConfigDefaults: function () {
    this.config = this.mergeDeep(this.mergeDeep({}, this.defaults), this.config || {});
  },

  mergeDeep: function (target, source) {
    for (const key in source) {
      if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
      const value = source[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        const base = target[key] && typeof target[key] === "object" && !Array.isArray(target[key]) ? target[key] : {};
        target[key] = this.mergeDeep(Object.assign({}, base), value);
      } else {
        target[key] = value;
      }
    }
    return target;
  },

  suspend: function () {
    Log.info(this.name + " suspended.");
    this.suspended = true;
    this.stopAnimation();
    this.setMirrored(false);
  },

  resume: function () {
    Log.info(this.name + " resumed.");
    this.suspended = false;
    if (this.currentEffect === "mirrored") {
      this.setMirrored(true);
    } else if (this.currentEffect === "spiderwebs") {
      this.scheduleCrawl(true);
    } else if (this.currentEffect && this.currentEffect !== "spiderwebs") {
      this.startCanvasAnimation();
    }
  },

  // Stops all timers and listeners (used by the standalone preview)
  destroy: function () {
    this.stopAnimation();
    this.setMirrored(false);
    clearInterval(this.checkTimer);
    clearTimeout(this.midnightTimer);
    clearTimeout(this.overrideTimer);
    window.removeEventListener("resize", this.onResize);
  },

  scheduleMidnightCheck: function () {
    const self = this;
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
    this.midnightTimer = setTimeout(function () {
      self.refreshEffect();
      self.scheduleMidnightCheck();
    }, next - now);
  },

  // -------------------------------------------------------------
  // EFFECT SELECTION
  // -------------------------------------------------------------
  isValidEffect: function (effect) {
    return OVERLAY_EFFECTS.indexOf(effect) !== -1;
  },

  validateEffect: function (effect, source) {
    if (!effect) return null;
    if (this.isValidEffect(effect)) return effect;
    Log.warn(this.name + ': Unknown effect "' + effect + '" from ' + source + ". Valid: " + OVERLAY_EFFECTS.join(", "));
    return null;
  },

  resolveEffect: function () {
    return this.override ? this.override.effect : this.determineActiveEffect();
  },

  refreshEffect: function () {
    const nextEffect = this.resolveEffect();
    if (nextEffect !== this.currentEffect) {
      Log.info(this.name + ": Transitioning effect from " + this.currentEffect + " to " + nextEffect);
      this.currentEffect = nextEffect;
      this.updateDom(0);
    }
  },

  // Calculate US Thanksgiving (4th Thursday of November)
  getUSThanksgiving: function (year) {
    const firstDayNov = new Date(year, 10, 1);
    const dayOfWeek = firstDayNov.getDay();
    const offset = (4 - dayOfWeek + 7) % 7;
    const firstThursday = 1 + offset;
    return firstThursday + 21;
  },

  // Calculate Canadian Thanksgiving (2nd Monday of October)
  getCanadianThanksgiving: function (year) {
    const firstDayOct = new Date(year, 9, 1);
    const dayOfWeek = firstDayOct.getDay();
    const offset = (1 - dayOfWeek + 7) % 7;
    const firstMonday = 1 + offset;
    return firstMonday + 7;
  },

  // Determine which holiday effect should be active right now
  determineActiveEffect: function () {
    // 1. Force effect override
    if (this.config.forceEffect) {
      return this.validateEffect(this.config.forceEffect, "forceEffect");
    }

    // Reference date
    let date = new Date();
    if (this.config.testDate) {
      date = new Date(this.config.testDate + "T12:00:00");
    }

    const month = date.getMonth() + 1; // 1 - 12
    const day = date.getDate();
    const year = date.getFullYear();
    const enabled = this.config.enabledEffects;

    // Check custom schedules first
    if (Array.isArray(this.config.customSchedules)) {
      for (let i = 0; i < this.config.customSchedules.length; i++) {
        const cs = this.config.customSchedules[i];
        if (cs.month === month && (cs.day === day || (cs.startDay <= day && cs.endDay >= day))) {
          const effect = this.validateEffect(cs.effect, "customSchedules");
          if (effect) return effect;
        }
      }
    }

    // 2. High-priority specific date holidays:
    // New Year's Eve (Dec 31) & New Year's Day (Jan 1) -> Confetti
    if (enabled.confetti && ((month === 12 && day === 31) || (month === 1 && day === 1))) {
      return "confetti";
    }

    // Christmas Eve & Christmas Day (Dec 24 - 25) -> Santas
    if (enabled.santas && month === 12 && (day === 24 || day === 25)) {
      return "santas";
    }

    // Valentine's Day (Feb 14) -> Hearts
    if (enabled.hearts && month === 2 && day === 14) {
      return "hearts";
    }

    // St. Patrick's Day (March 17) -> Clovers
    if (enabled.clovers && month === 3 && day === 17) {
      return "clovers";
    }

    // July 1-4 -> Fireworks
    const fwDates = this.config.fireworks.dates || [1, 2, 3, 4];
    if (enabled.fireworks && month === 7 && fwDates.includes(day)) {
      return "fireworks";
    }

    // Thanksgiving -> Turkeys
    if (enabled.turkeys) {
      const includeWeekend = this.config.turkeys.thanksgivingIncludeWeekend;
      if (this.config.turkeys.thanksgivingType === "canadian") {
        // Long weekend runs Saturday through the Monday holiday
        const canDay = this.getCanadianThanksgiving(year);
        if (month === 10 && (day === canDay || (includeWeekend && day >= canDay - 2 && day <= canDay))) {
          return "turkeys";
        }
      } else {
        // Thursday through Sunday
        const usDay = this.getUSThanksgiving(year);
        if (month === 11 && (day === usDay || (includeWeekend && day >= usDay && day <= usDay + 3))) {
          return "turkeys";
        }
      }
    }

    // April Fools' Day (April 1) -> Mirrored screen
    if (enabled.mirrored && month === 4 && day === 1) {
      return "mirrored";
    }

    // 3. Month-long atmospheric effects:
    // October -> Spider webs in corner
    if (enabled.spiderwebs && month === 10) {
      return "spiderwebs";
    }

    // December -> Snow
    if (enabled.snow && month === 12) {
      return "snow";
    }

    return null;
  },

  getDom: function () {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-overlay-root mmm-overlay-fade-in";

    // Clean up previous animations
    this.stopAnimation();
    this.canvas = null;
    this.ctx = null;
    this.crawlerEl = null;
    this.setMirrored(this.currentEffect === "mirrored" && !this.suspended);

    if (!this.currentEffect || this.currentEffect === "mirrored") {
      return wrapper; // Empty overlay when no holiday is active
    }

    if (this.currentEffect === "spiderwebs") {
      this.buildSpiderWebsDom(wrapper);
      if (!this.suspended) {
        this.scheduleCrawl(true);
      }
    } else {
      this.canvas = document.createElement("canvas");
      this.canvas.className = "mmm-overlay-canvas";
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.ctx = this.canvas.getContext("2d");
      wrapper.appendChild(this.canvas);

      // First frame is drawn on the next animation frame, after DOM insertion
      if (!this.suspended) {
        this.startCanvasAnimation();
      }
    }

    return wrapper;
  },

  // -------------------------------------------------------------
  // MIRRORED EFFECT (April Fools' Day)
  // -------------------------------------------------------------
  // Flips the entire page (every module, not just this overlay) horizontally
  setMirrored: function (on) {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("mmm-overlay-mirrored", on);
  },

  // -------------------------------------------------------------
  // SPIDER WEBS EFFECT (October)
  // -------------------------------------------------------------
  generateCornerWebSvg: function (size, color) {
    const angles = [0, 15, 30, 45, 60, 75, 90].map(function (a) {
      return (a * Math.PI) / 180;
    });
    const ringFactors = [0.15, 0.28, 0.44, 0.62, 0.81, 1.0];
    const rings = ringFactors.map(function (f) {
      return f * size;
    });

    let spokes = "";
    for (let i = 0; i < angles.length; i++) {
      const a = angles[i];
      const x = (Math.cos(a) * size * 1.06).toFixed(1);
      const y = (Math.sin(a) * size * 1.06).toFixed(1);
      spokes += "M0,0 L" + x + "," + y + " ";
    }

    let curves = "";
    for (let rIdx = 0; rIdx < rings.length; rIdx++) {
      const r = rings[rIdx];
      for (let i = 0; i < angles.length - 1; i++) {
        const a1 = angles[i];
        const a2 = angles[i + 1];
        const aMid = (a1 + a2) / 2;
        const x1 = (Math.cos(a1) * r).toFixed(1);
        const y1 = (Math.sin(a1) * r).toFixed(1);
        const x2 = (Math.cos(a2) * r).toFixed(1);
        const y2 = (Math.sin(a2) * r).toFixed(1);
        const sag = r * 0.09;
        const cx = (Math.cos(aMid) * (r - sag)).toFixed(1);
        const cy = (Math.sin(aMid) * (r - sag)).toFixed(1);
        curves += "M" + x1 + "," + y1 + " Q" + cx + "," + cy + " " + x2 + "," + y2 + " ";
      }
    }

    return (
      '<svg viewBox="0 0 ' + size + " " + size + '" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="' + spokes + '" stroke="' + color + '" stroke-width="1.3" fill="none" opacity="0.85" />' +
      '<path d="' + curves + '" stroke="' + color + '" stroke-width="1.1" fill="none" opacity="0.75" />' +
      "</svg>"
    );
  },

  generateSpiderSvg: function () {
    return (
      // The thread starts well above the top of the box (drawn with overflow
      // visible) so its end never shows when the spider bobs downward
      '<svg viewBox="0 0 60 160" width="60" height="160" overflow="visible" xmlns="http://www.w3.org/2000/svg">' +
      '  <line x1="30" y1="-100" x2="30" y2="108" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" />' +
      '  <path d="M30,116 Q18,102 6,112 M30,120 Q14,115 4,126 M30,124 Q14,128 8,142 M30,126 Q20,138 12,150" stroke="#777" stroke-width="1.4" fill="none" stroke-linecap="round" />' +
      '  <path d="M30,116 Q42,102 54,112 M30,120 Q46,115 56,126 M30,124 Q46,128 52,142 M30,126 Q40,138 48,150" stroke="#777" stroke-width="1.4" fill="none" stroke-linecap="round" />' +
      '  <ellipse cx="30" cy="132" rx="9" ry="12" fill="#222" stroke="#555" stroke-width="1" />' +
      '  <ellipse cx="30" cy="132" rx="3" ry="5" fill="#444" opacity="0.5" />' +
      '  <circle cx="30" cy="118" r="6" fill="#181818" stroke="#555" stroke-width="0.9" />' +
      '  <circle cx="28" cy="116" r="1.1" fill="#ff3333" />' +
      '  <circle cx="32" cy="116" r="1.1" fill="#ff3333" />' +
      "</svg>"
    );
  },

  buildSpiderWebsDom: function (wrapper) {
    const cfg = this.config.spiderwebs;
    const corners = cfg.corners || ["top-left", "top-right"];
    const size = cfg.webSize || 320;
    const color = cfg.webColor || "rgba(255, 255, 255, 0.45)";
    const webSvg = this.generateCornerWebSvg(size, color);

    for (let i = 0; i < corners.length; i++) {
      const webDiv = document.createElement("div");
      webDiv.className = "mmm-web-corner " + corners[i];
      webDiv.style.width = size + "px";
      webDiv.style.height = size + "px";
      webDiv.innerHTML = webSvg;
      wrapper.appendChild(webDiv);
    }

    if (cfg.showSpider) {
      const spiderDiv = document.createElement("div");
      spiderDiv.className = "mmm-spider-container";
      // Hang the spider from the web, 140px in from the edge on a 320px web
      const inset = Math.round(size * 0.44) + "px";
      if (String(cfg.spiderCorner).indexOf("left") !== -1) {
        spiderDiv.style.left = inset;
      } else {
        spiderDiv.style.right = inset;
      }
      const bobber = document.createElement("div");
      bobber.className = "mmm-spider-bobber";
      bobber.innerHTML = this.generateSpiderSvg();
      spiderDiv.appendChild(bobber);
      wrapper.appendChild(spiderDiv);
    }

    if (cfg.crawlingSpider) {
      const crawlerSize = cfg.crawlerSize || 44;
      const crawler = document.createElement("div");
      crawler.className = "mmm-crawler";
      crawler.style.width = crawlerSize + "px";
      crawler.style.height = crawlerSize + "px";
      crawler.innerHTML = this.generateCrawlerSvg();
      wrapper.appendChild(crawler);
      this.crawlerEl = crawler;
    }
  },

  // Top-down spider facing +x; legs are split into the two alternating sets of
  // a real spider's gait so CSS can swing them out of phase
  generateCrawlerSvg: function () {
    const legs = [
      [5, 3, 14, 12, 25, 9],
      [4, 4, 10, 14, 16, 22],
      [2, 4, -2, 15, -6, 23],
      [1, 3, -8, 12, -21, 18]
    ];
    const sets = ["", ""];
    for (let i = 0; i < legs.length; i++) {
      const l = legs[i];
      for (let side = -1; side <= 1; side += 2) {
        const d = "M" + l[0] + "," + side * l[1] + " L" + l[2] + "," + side * l[3] + " L" + l[4] + "," + side * l[5] + " ";
        sets[(i + (side > 0 ? 1 : 0)) % 2] += d;
      }
    }
    return (
      '<svg viewBox="-30 -30 60 60" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">' +
      '<g stroke="#777" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round">' +
      '<path class="mmm-crawler-legs-a" d="' + sets[0] + '" />' +
      '<path class="mmm-crawler-legs-b" d="' + sets[1] + '" />' +
      "</g>" +
      '<ellipse cx="-9" cy="0" rx="11" ry="8" fill="#222" stroke="#555" stroke-width="1" />' +
      '<ellipse cx="-10" cy="0" rx="5" ry="2.5" fill="#444" opacity="0.5" />' +
      '<ellipse cx="5" cy="0" rx="6" ry="5" fill="#181818" stroke="#555" stroke-width="0.9" />' +
      '<circle cx="10" cy="-1.6" r="1.1" fill="#ff3333" />' +
      '<circle cx="10" cy="1.6" r="1.1" fill="#ff3333" />' +
      "</svg>"
    );
  },

  // Waits a random delay, then sends the spider across the screen. The render
  // loop only runs during a crawl, so the idle time between crawls costs nothing.
  scheduleCrawl: function (first) {
    if (!this.crawlerEl) return;
    clearTimeout(this.crawlTimer);
    this.crawlerEl.style.visibility = "hidden";
    const cfg = this.config.spiderwebs;
    const delay = first ? this.randomRange(3000, 10000) : this.randomRange(cfg.crawlDelayMin, cfg.crawlDelayMax);
    const self = this;
    this.crawlTimer = setTimeout(function () {
      self.crawlTimer = null;
      self.startCrawl();
    }, delay);
  },

  startCrawl: function () {
    if (!this.crawlerEl || this.suspended) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const margin = this.config.spiderwebs.crawlerSize || 44;
    const self = this;
    const along = function (len) {
      return self.randomRange(len * 0.1, len * 0.9);
    };

    // Enter just off a random edge and head for a random point off the opposite one
    // (ax, ay) is the direction across the screen, used to detect the exit
    let x, y, tx, ty, ax, ay;
    const side = Math.floor(Math.random() * 4);
    if (side === 0) {
      x = -margin; y = along(h); tx = w + margin; ty = along(h); ax = 1; ay = 0;
    } else if (side === 1) {
      x = w + margin; y = along(h); tx = -margin; ty = along(h); ax = -1; ay = 0;
    } else if (side === 2) {
      x = along(w); y = -margin; tx = along(w); ty = h + margin; ax = 0; ay = 1;
    } else {
      x = along(w); y = h + margin; tx = along(w); ty = -margin; ax = 0; ay = -1;
    }

    this.crawler = {
      x: x,
      y: y,
      tx: tx,
      ty: ty,
      ax: ax,
      ay: ay,
      heading: Math.atan2(ty - y, tx - x),
      wander: 0, // offset (radians) from the bearing to the target
      speed: this.newCrawlSpeed(),
      pause: 0,
      nextPause: this.randomRange(60, 240),
      half: margin / 2,
      w: w,
      h: h,
      entered: false
    };
    this.crawlerEl.style.visibility = "visible";
    this.setCrawlerWalking(true);
    this.positionCrawler();
    this.startRenderLoop(function (step) {
      self.updateCrawler(step);
    });
  },

  newCrawlSpeed: function () {
    return this.config.spiderwebs.crawlSpeed * this.randomRange(0.6, 1.4);
  },

  setCrawlerWalking: function (walking) {
    this.crawlerEl.classList.toggle("mmm-crawler-walking", walking);
  },

  positionCrawler: function () {
    const c = this.crawler;
    this.crawlerEl.style.transform =
      "translate3d(" + (c.x - c.half).toFixed(1) + "px," + (c.y - c.half).toFixed(1) + "px,0) rotate(" + c.heading.toFixed(3) + "rad)";
  },

  updateCrawler: function (step) {
    const c = this.crawler;

    // Spiders move in bursts: stop now and then, then dart off at a new speed
    if (c.pause > 0) {
      c.pause -= step;
      if (c.pause <= 0) {
        c.speed = this.newCrawlSpeed();
        this.setCrawlerWalking(true);
      }
      return;
    }
    c.nextPause -= step;
    if (c.nextPause <= 0) {
      c.pause = this.randomRange(20, 110);
      c.nextPause = this.randomRange(60, 300);
      // Often pick a new direction while stopped
      if (Math.random() < 0.5) {
        c.wander = this.randomRange(-0.9, 0.9);
      }
      this.setCrawlerWalking(false);
      return;
    }

    // Random walk on the heading offset; capped well below 90 degrees so the
    // spider always keeps making progress toward the far edge
    c.wander = Math.min(Math.max(c.wander + (Math.random() - 0.5) * 0.15 * step, -0.9), 0.9);
    // Once it has wandered off a side edge, head straight back toward the target
    if (c.entered && (c.x < 0 || c.x > c.w || c.y < 0 || c.y > c.h)) {
      c.wander *= Math.pow(0.85, step);
    } else if (!c.entered && c.x >= 0 && c.x <= c.w && c.y >= 0 && c.y <= c.h) {
      c.entered = true;
    }
    const dx = c.tx - c.x;
    const dy = c.ty - c.y;
    let turn = Math.atan2(dy, dx) + c.wander - c.heading;
    turn = Math.atan2(Math.sin(turn), Math.cos(turn)); // normalize to [-PI, PI]
    c.heading += turn * Math.min(1, 0.08 * step);

    const move = c.speed * step;
    c.x += Math.cos(c.heading) * move;
    c.y += Math.sin(c.heading) * move;
    this.positionCrawler();

    // Done once it has crossed the far edge and is fully out of sight
    if ((c.x - c.tx) * c.ax + (c.y - c.ty) * c.ay >= 0) {
      this.stopAnimation();
      this.scheduleCrawl(false);
    }
  },

  // -------------------------------------------------------------
  // CANVAS EFFECTS ENGINE
  // -------------------------------------------------------------
  stopAnimation: function () {
    this.animationRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    clearTimeout(this.crawlTimer);
    this.crawlTimer = null;
    this.crawler = null;
    this.particles = [];
    this.secondaryParticles = [];
    this.rockets = [];
    this.sparks = [];
    this.sparkPool = [];
  },

  startCanvasAnimation: function () {
    if (!this.canvas || !this.ctx) return;
    this.stopAnimation();

    const w = this.canvas.width;
    const h = this.canvas.height;

    if (this.currentEffect === "snow") {
      this.initSnow(w, h);
    } else if (this.currentEffect === "fireworks") {
      this.initFireworks();
    } else if (this.currentEffect === "confetti") {
      this.initConfetti(w, h);
    } else if (this.currentEffect === "hearts" || this.currentEffect === "clovers" || this.currentEffect === "turkeys") {
      this.initEmojis(w, h, this.config[this.currentEffect]);
    } else if (this.currentEffect === "santas") {
      this.initSantas(w, h);
    }

    const self = this;
    this.startRenderLoop(function (step) {
      self.updateAndRender(step);
    });
  },

  // Calls onFrame(step) every animation frame until stopAnimation()
  startRenderLoop: function (onFrame) {
    this.animationRunning = true;
    this.lastFrameTime = null;
    const self = this;
    function renderLoop(now) {
      if (!self.animationRunning) return;
      // Frame step in units of 60 fps frames
      let step = 1;
      if (self.lastFrameTime !== null) {
        step = Math.min(Math.max((now - self.lastFrameTime) / OVERLAY_FRAME_MS, 0), OVERLAY_MAX_STEP);
      }
      self.lastFrameTime = now;
      onFrame(step);
      // onFrame may have stopped the loop (e.g. a finished crawl)
      if (self.animationRunning) {
        self.rafId = requestAnimationFrame(renderLoop);
      }
    }
    this.rafId = requestAnimationFrame(renderLoop);
  },

  randomRange: function (min, max) {
    return Math.random() * (max - min) + min;
  },

  // Small offscreen canvas with a filled circle, drawn with drawImage instead of
  // building and filling a new arc path for every point every frame
  createDotSprite: function (radius, color) {
    const size = Math.ceil(radius * 2) + 2;
    const sprite = document.createElement("canvas");
    sprite.width = size;
    sprite.height = size;
    const sctx = sprite.getContext("2d");
    sctx.fillStyle = color;
    sctx.beginPath();
    sctx.arc(size / 2, size / 2, radius, 0, OVERLAY_TAU);
    sctx.fill();
    return { canvas: sprite, half: size / 2 };
  },

  // Rasterizes an emoji once at its exact display size. Drawing color emoji
  // glyphs with fillText every frame is far more expensive than a bitmap blit.
  createEmojiSprite: function (emoji, size) {
    const font = size + OVERLAY_EMOJI_FONT;
    const sprite = document.createElement("canvas");
    let sctx = sprite.getContext("2d");
    sctx.font = font;
    sctx.textAlign = "center";
    sctx.textBaseline = "middle";
    const m = sctx.measureText(emoji);
    const pad = 2;
    const left = Math.ceil(m.actualBoundingBoxLeft || size * 0.6) + pad;
    const right = Math.ceil(m.actualBoundingBoxRight || size * 0.6) + pad;
    const top = Math.ceil(m.actualBoundingBoxAscent || size * 0.6) + pad;
    const bottom = Math.ceil(m.actualBoundingBoxDescent || size * 0.6) + pad;

    sprite.width = left + right;
    sprite.height = top + bottom;
    // Resizing resets context state
    sctx = sprite.getContext("2d");
    sctx.font = font;
    sctx.textAlign = "center";
    sctx.textBaseline = "middle";
    sctx.fillText(emoji, left, top);
    // Offsets place the glyph anchor exactly where fillText(emoji, 0, 0) would
    return { canvas: sprite, offsetX: -left, offsetY: -top };
  },

  // --- SNOW ---
  createSnowflake: function (w, h, radius, speedY, swayWidth, alpha) {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      radius: radius,
      speedY: speedY,
      sway: Math.random() * OVERLAY_TAU,
      swaySpeed: Math.random() * 0.02 + 0.01,
      swayWidth: swayWidth,
      // Quantized to 1/40 steps (invisible) so flakes can share fill calls
      alpha: Math.round(alpha * 40) / 40
    };
  },

  sortByAlpha: function (particles) {
    particles.sort(function (a, b) {
      return a.alpha - b.alpha;
    });
  },

  initSnow: function (w, h) {
    const cfg = this.config.snow;
    const count = Math.round(cfg.count * this.intensityScale);
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createSnowflake(
        w, h,
        this.randomRange(cfg.sizeMin, cfg.sizeMax),
        this.randomRange(cfg.speedMin, cfg.speedMax),
        Math.random() * 0.9 + 0.3,
        Math.random() * 0.5 + 0.4
      ));
    }
    this.sortByAlpha(this.particles);
  },

  // --- FIREWORKS ---
  initFireworks: function () {
    this.rockets = [];
    this.sparks = [];
    this.sparkPool = [];
    this.nextLaunchIn = 0; // launch immediately
    this.pendingLaunches = [];
    this.sparkDot = this.sparkDot || this.createDotSprite(1.0, "#FFFFFF");
    this.trailDot = this.trailDot || this.createDotSprite(1.8, "rgb(255, 220, 150)");
  },

  launchRocket: function () {
    const cfg = this.config.fireworks;
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.rockets.push({
      x: Math.random() * (w * 0.7) + w * 0.15,
      y: h,
      targetY: Math.random() * (h * 0.45) + h * 0.15,
      vx: (Math.random() - 0.5) * 1.8,
      vy: -(Math.random() * 3 + 12),
      trailX: [],
      trailY: [],
      color: cfg.colors[Math.floor(Math.random() * cfg.colors.length)]
    });
  },

  // Rocket launches are scheduled on the render clock instead of timers, so
  // they pause with the animation and never pile up
  scheduleLaunches: function (elapsedMs) {
    this.nextLaunchIn -= elapsedMs;
    while (this.nextLaunchIn <= 0) {
      this.launchRocket();
      // Occasionally launch a 2nd rocket shortly after
      if (Math.random() < 0.35) {
        this.pendingLaunches.push(180);
      }
      this.nextLaunchIn += this.config.fireworks.launchInterval;
    }
    for (let i = this.pendingLaunches.length - 1; i >= 0; i--) {
      this.pendingLaunches[i] -= elapsedMs;
      if (this.pendingLaunches[i] <= 0) {
        this.launchRocket();
        this.pendingLaunches.splice(i, 1);
      }
    }
  },

  explodeRocket: function (r) {
    const sparkCount = this.config.fireworks.sparkCount || 65;
    for (let s = 0; s < sparkCount; s++) {
      const angle = (OVERLAY_TAU * s) / sparkCount + (Math.random() - 0.5) * 0.35;
      const speed = Math.random() * 4.6 + 1.8;
      const sp = this.sparkPool.pop() || {};
      sp.x = r.x;
      sp.y = r.y;
      sp.vx = Math.cos(angle) * speed;
      sp.vy = Math.sin(angle) * speed;
      sp.color = r.color;
      sp.alpha = 1.0;
      sp.decay = Math.random() * 0.016 + 0.012;
      this.sparks.push(sp);
    }
  },

  // --- CONFETTI ---
  initConfetti: function (w, h) {
    const cfg = this.config.confetti;
    const count = Math.round(cfg.count * this.intensityScale);
    this.particles = [];
    for (let i = 0; i < count; i++) {
      const p = { color: cfg.colors[Math.floor(Math.random() * cfg.colors.length)] };
      this.resetConfettiPiece(p, w, h, true);
      this.particles.push(p);
    }
    // Group by color so fillStyle only changes once per color each frame.
    // Pieces keep their color when they respawn to preserve the grouping.
    this.particles.sort(function (a, b) {
      return a.color < b.color ? -1 : a.color > b.color ? 1 : 0;
    });
  },

  resetConfettiPiece: function (p, w, h, initial) {
    const cfg = this.config.confetti;
    p.x = Math.random() * w;
    p.y = initial ? Math.random() * h : -20;
    p.size = Math.random() * 8 + 7;
    p.aspectRatio = Math.random() * 0.4 + 0.35;
    p.vx = (Math.random() - 0.5) * 1.8;
    p.vy = this.randomRange(cfg.speedMin, cfg.speedMax);
    p.rotX = Math.random() * OVERLAY_TAU;
    p.rotY = Math.random() * OVERLAY_TAU;
    p.rotZ = Math.random() * OVERLAY_TAU;
    p.vRotX = (Math.random() - 0.5) * 0.1;
    p.vRotY = (Math.random() - 0.5) * 0.12;
    p.vRotZ = (Math.random() - 0.5) * 0.08;
    p.sway = Math.random() * OVERLAY_TAU;
    p.swaySpeed = Math.random() * 0.03 + 0.015;
  },

  // --- EMOJIS (Hearts, Clovers, Turkeys, Santas) ---
  initEmojis: function (w, h, cfg) {
    const count = Math.round(cfg.count * this.intensityScale);
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createEmojiParticle(w, h, cfg, true));
    }
  },

  initSantas: function (w, h) {
    const cfg = this.config.santas;
    this.initEmojis(w, h, cfg);
    // Combine with background snow flurries if enabled
    if (cfg.combineSnowWithSantas) {
      const snowCount = Math.round(45 * this.intensityScale);
      this.secondaryParticles = [];
      for (let j = 0; j < snowCount; j++) {
        this.secondaryParticles.push(this.createSnowflake(
          w, h,
          Math.random() * 2.5 + 1.2,
          Math.random() * 1.5 + 0.7,
          0.5,
          Math.random() * 0.45 + 0.3
        ));
      }
      this.sortByAlpha(this.secondaryParticles);
    }
  },

  createEmojiParticle: function (w, h, cfg, initial) {
    const emojis = cfg.emojis && cfg.emojis.length ? cfg.emojis : ["✨"];
    const direction = cfg.direction || "down";
    const speedMin = cfg.speedMin || 1.2;
    const speedMax = cfg.speedMax || 2.5;
    const sizeMin = cfg.sizeMin || 24;
    const sizeMax = cfg.sizeMax || 42;

    // Whole pixel font sizes so each sprite renders crisply at 1:1
    const size = Math.round(this.randomRange(sizeMin, sizeMax));
    const speed = this.randomRange(speedMin, speedMax);
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];

    let y, vy;
    if (direction === "up") {
      y = initial ? Math.random() * h : h + size + 10;
      vy = -speed;
    } else {
      y = initial ? Math.random() * h : -size - 10;
      vy = speed;
    }

    return {
      x: Math.random() * w,
      y: y,
      vy: vy,
      size: size,
      emoji: emoji,
      sprite: typeof document !== "undefined" ? this.createEmojiSprite(emoji, size) : null,
      direction: direction,
      sway: Math.random() * OVERLAY_TAU,
      swaySpeed: Math.random() * 0.025 + 0.012,
      swayAmount: Math.random() * 1.0 + 0.6,
      rotation: (Math.random() - 0.5) * 0.4,
      rotSpeed: (Math.random() - 0.5) * 0.018,
      alpha: Math.random() * 0.25 + 0.75
    };
  },

  // -------------------------------------------------------------
  // ANIMATION FRAME UPDATE & RENDER
  // -------------------------------------------------------------
  updateAndRender: function (step) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);

    if (this.currentEffect === "snow") {
      this.renderSnowLayer(ctx, this.particles, w, h, step, this.config.snow.wind || 0);
    } else if (this.currentEffect === "fireworks") {
      this.scheduleLaunches(step * OVERLAY_FRAME_MS);
      this.renderFireworks(ctx, step);
    } else if (this.currentEffect === "confetti") {
      this.renderConfetti(ctx, w, h, step);
    } else {
      // Optional background snow (e.g. for Santas)
      if (this.secondaryParticles.length > 0) {
        this.renderSnowLayer(ctx, this.secondaryParticles, w, h, step, 0.2);
      }
      this.renderEmojis(ctx, w, h, step);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
  },

  // Particles are pre-sorted by alpha, so all flakes sharing an alpha are
  // filled as one path instead of one fill call per flake
  renderSnowLayer: function (ctx, particles, w, h, step, wind) {
    ctx.fillStyle = "#FFFFFF";
    let currentAlpha = -1;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.sway += p.swaySpeed * step;
      p.x += (Math.sin(p.sway) * p.swayWidth + wind) * step;
      p.y += p.speedY * step;

      if (p.y > h + p.radius) {
        p.y = -p.radius;
        p.x = Math.random() * w;
      }
      if (p.x > w + p.radius) p.x = -p.radius;
      if (p.x < -p.radius) p.x = w + p.radius;

      if (p.alpha !== currentAlpha) {
        if (currentAlpha !== -1) ctx.fill();
        ctx.globalAlpha = p.alpha;
        ctx.beginPath();
        currentAlpha = p.alpha;
      }
      ctx.moveTo(p.x + p.radius, p.y);
      ctx.arc(p.x, p.y, p.radius, 0, OVERLAY_TAU);
    }
    if (currentAlpha !== -1) ctx.fill();
    ctx.globalAlpha = 1;
  },

  renderFireworks: function (ctx, step) {
    const trailDot = this.trailDot;
    const sparkDot = this.sparkDot;

    // 1. Update & draw rockets
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.x += r.vx * step;
      r.y += r.vy * step;
      r.vy += 0.15 * step; // rocket gravity deceleration

      r.trailX.push(r.x);
      r.trailY.push(r.y);
      if (r.trailX.length > 7) {
        r.trailX.shift();
        r.trailY.shift();
      }

      const len = r.trailX.length;
      for (let t = 0; t < len; t++) {
        ctx.globalAlpha = 0.9 * (t / len);
        ctx.drawImage(trailDot.canvas, r.trailX[t] - trailDot.half, r.trailY[t] - trailDot.half);
      }

      // Rocket head
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(r.x, r.y, 2.5, 0, OVERLAY_TAU);
      ctx.fill();

      // Trigger explosion at apex
      if (r.y <= r.targetY || r.vy >= -1) {
        this.explodeRocket(r);
        this.rockets.splice(i, 1);
      }
    }

    // 2. Update & draw sparks. Dead sparks are compacted out in place (keeping
    // each burst contiguous so strokeStyle changes once per burst) and recycled.
    const friction = Math.pow(0.955, step);
    const gravity = 0.052 * step;
    const sparks = this.sparks;
    let alive = 0;
    let currentColor = null;
    ctx.lineWidth = 2.0;

    for (let s = 0; s < sparks.length; s++) {
      const sp = sparks[s];
      sp.vx *= friction;
      sp.vy *= friction;
      sp.vy += gravity;
      sp.x += sp.vx * step;
      sp.y += sp.vy * step;
      sp.alpha -= sp.decay * step;

      if (sp.alpha <= 0) {
        this.sparkPool.push(sp);
        continue;
      }
      sparks[alive++] = sp;

      ctx.globalAlpha = sp.alpha;
      if (sp.color !== currentColor) {
        ctx.strokeStyle = sp.color;
        currentColor = sp.color;
      }
      ctx.beginPath();
      ctx.moveTo(sp.x - sp.vx * 1.5, sp.y - sp.vy * 1.5);
      ctx.lineTo(sp.x, sp.y);
      ctx.stroke();

      // Bright center point
      ctx.drawImage(sparkDot.canvas, sp.x - sparkDot.half, sp.y - sparkDot.half);
    }
    sparks.length = alive;
    ctx.globalAlpha = 1;
  },

  renderConfetti: function (ctx, w, h, step) {
    let currentColor = null;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.sway += p.swaySpeed * step;
      p.x += (p.vx + Math.sin(p.sway) * 0.9) * step;
      p.y += p.vy * step;
      p.rotX += p.vRotX * step;
      p.rotY += p.vRotY * step;
      p.rotZ += p.vRotZ * step;

      if (p.y > h + 25) {
        this.resetConfettiPiece(p, w, h, false);
        continue;
      }

      if (p.color !== currentColor) {
        ctx.fillStyle = p.color;
        currentColor = p.color;
      }
      // Equivalent to translate(x, y) -> rotate(rotZ) -> scale(sx, sy), without save/restore
      const cos = Math.cos(p.rotZ);
      const sin = Math.sin(p.rotZ);
      const sx = Math.cos(p.rotX);
      const sy = Math.sin(p.rotY);
      ctx.setTransform(cos * sx, sin * sx, -sin * sy, cos * sy, p.x, p.y);
      const ph = p.size * p.aspectRatio;
      ctx.fillRect(-p.size / 2, -ph / 2, p.size, ph);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  },

  renderEmojis: function (ctx, w, h, step) {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.sway += p.swaySpeed * step;
      p.x += Math.sin(p.sway) * p.swayAmount * step;
      p.y += p.vy * step;
      p.rotation += p.rotSpeed * step;

      // Wrap around screen
      if (p.direction === "up") {
        if (p.y < -p.size - 25) {
          p.y = h + p.size + 10;
          p.x = Math.random() * w;
        }
      } else if (p.y > h + p.size + 25) {
        p.y = -p.size - 10;
        p.x = Math.random() * w;
      }

      const cos = Math.cos(p.rotation);
      const sin = Math.sin(p.rotation);
      ctx.globalAlpha = p.alpha;
      ctx.setTransform(cos, sin, -sin, cos, p.x, p.y);
      ctx.drawImage(p.sprite.canvas, p.sprite.offsetX, p.sprite.offsetY);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
  },

  // -------------------------------------------------------------
  // NOTIFICATION HANDLING (Remote Control / Integration)
  // -------------------------------------------------------------
  clearOverrideTimer: function () {
    if (this.overrideTimer) {
      clearTimeout(this.overrideTimer);
      this.overrideTimer = null;
    }
  },

  notificationReceived: function (notification, payload) {
    if (notification === "OVERLAY_EFFECT_SET") {
      const effect = payload && this.validateEffect(payload.effect, "OVERLAY_EFFECT_SET");
      if (!effect) return;
      Log.info(this.name + ": Received OVERLAY_EFFECT_SET for " + effect);
      this.clearOverrideTimer();
      this.override = { effect: effect };
      // Optional temporary duration; without one the effect stays until reset
      if (payload.duration && payload.duration > 0) {
        const self = this;
        this.overrideTimer = setTimeout(function () {
          self.overrideTimer = null;
          self.override = null;
          self.refreshEffect();
        }, payload.duration);
      }
      this.refreshEffect();
    } else if (notification === "OVERLAY_EFFECT_RESET") {
      Log.info(this.name + ": Resetting effect to current date default");
      this.clearOverrideTimer();
      this.override = null;
      this.refreshEffect();
    } else if (notification === "OVERLAY_EFFECT_TOGGLE") {
      this.clearOverrideTimer();
      // Off stays off until toggled again or reset; on returns to the schedule
      this.override = this.currentEffect ? { effect: null } : null;
      this.refreshEffect();
    }
  }
});
