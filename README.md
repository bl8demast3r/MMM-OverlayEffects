# MMM-OverlayEffects

> [!NOTE]
> **AI disclaimer**: This module was written with AI assistance. The original code was AI-generated, and it has since been reviewed, bug-fixed and performance-optimized with **Claude** (Anthropic). All changes are tested, but review the code yourself before relying on it.

A lightweight holiday and seasonal overlay module for **[MagicMirror²](https://magicmirror.builders/)**.

It sits in the `fullscreen_above` region and draws effects across the whole mirror without blocking clicks or touches (`pointer-events: none`).

---

## ✨ Holiday Schedule & Effects

| Date / Range | Effect | Visual Description |
| :--- | :--- | :--- |
| **October** *(All month)* | **Spider Webs** 🕸️ | SVG spider webs in the screen corners with a spider swinging on a silk thread, plus a spider that scuttles across the screen every so often along a random, wandering path. |
| **December** *(Dec 1–23, 26–30)* | **Snow** ❄️ | Snowflakes of varied size and opacity drifting and swaying down the screen. |
| **July 1 – 4** | **Fireworks** 🎆 | Rockets launching upwards and bursting into multi-colored sparks. |
| **February 14** *(Valentine's)* | **Hearts & Emojis** 😍 | Hearts and heart-eyes emojis (`❤️`, `💖`, `💕`, `💓`, `😍`, `🥰`, `💘`) floating upwards. |
| **New Year’s Eve & Day** *(Dec 31, Jan 1)* | **Confetti** 🎉 | Tumbling 3D paper confetti fluttering downward. |
| **March 17** *(St. Patrick’s Day)* | **Green Clovers** ☘️🍀 | Falling 3-leaf shamrock and 4-leaf clover emojis. |
| **Thanksgiving** *(4th Thursday in Nov)* | **Turkeys** 🦃 | Falling, wobbling turkey emojis. |
| **Christmas Eve & Day** *(Dec 24 – 25)* | **Falling Santas** 🎅 | Falling Santa emojis (`🎅`, `🤶`, `🧑‍🎄`) with light background snow. |
| **April 1** *(April Fools' Day)* | **Mirrored Screen** 🪞 | The entire mirror, every module included, is flipped horizontally for the day. |

> [!NOTE]
> When no effect is active, the overlay is an empty element and no animation loop runs.

---

## 🚀 Installation

Navigate to your MagicMirror's `modules` folder and clone this repository:

```bash
cd ~/MagicMirror/modules
git clone https://github.com/bl8demast3r/MMM-OverlayEffects.git
```

No npm dependencies are required.

### Updating

```bash
cd ~/MagicMirror/modules/MMM-OverlayEffects
git pull
```

---

## ⚙️ Configuration

Add the module to your `config/config.js` file at `position: "fullscreen_above"`:

```javascript
{
  module: "MMM-OverlayEffects",
  position: "fullscreen_above",
  config: {
    intensity: "medium" // "low", "medium", or "high"
  }
}
```

### Testing & Previewing Effects
You don't need to wait for a holiday to see an effect. Force one with `forceEffect`, or simulate a date with `testDate`:

```javascript
{
  module: "MMM-OverlayEffects",
  position: "fullscreen_above",
  config: {
    // "spiderwebs", "snow", "fireworks", "hearts", "confetti", "clovers", "turkeys", "santas", "mirrored"
    forceEffect: "spiderwebs"
  }
}
```

```javascript
{
  module: "MMM-OverlayEffects",
  position: "fullscreen_above",
  config: {
    testDate: "2026-10-31" // October 31 (Halloween)
  }
}
```

An unknown effect name is ignored and logged as a warning in the browser console.

---

## 🎛️ Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `forceEffect` | `string \| null` | `null` | Force an effect regardless of date: `"spiderwebs"`, `"snow"`, `"fireworks"`, `"hearts"`, `"confetti"`, `"clovers"`, `"turkeys"`, `"santas"`, `"mirrored"`. Set to `null` for automatic calendar scheduling. |
| `testDate` | `string \| null` | `null` | Simulate a date formatted as `"YYYY-MM-DD"`. |
| `intensity` | `string` | `"medium"` | Particle count multiplier: `"low"` (0.55x), `"medium"` (1.0x), `"high"` (1.6x). |
| `checkInterval` | `number` | `600000` | Fallback interval (ms) for re-checking the date. A check also runs automatically just after midnight, so effects switch on time. |
| `enabledEffects` | `object` | *(all true)* | Turn individual effects on or off, e.g. `{ snow: false }`. Effects you don't list stay enabled. |
| `customSchedules` | `array` | `[]` | Add custom recurring events or birthdays (see below). |

### Per-Effect Options

Every per-effect option is optional. You only need to list the settings you want to change; anything you leave out keeps its default (e.g. `snow: { count: 150 }` keeps the default speeds and sizes).

```javascript
config: {
  // October: Spider Webs
  spiderwebs: {
    corners: ["top-left", "top-right"], // also "bottom-left", "bottom-right"
    showSpider: true,                    // hanging swinging spider
    spiderCorner: "top-right",           // "top-left" or "top-right"
    webColor: "rgba(255, 255, 255, 0.45)",
    webSize: 320,                        // web size in px (capped at 40% of the screen)
    crawlingSpider: true,                // spider crawling from one edge to the opposite one
    crawlDelayMin: 20000,                // ms between crawls (random within this range)
    crawlDelayMax: 60000,
    crawlSpeed: 1.8,                     // px per frame while moving
    crawlerSize: 44                      // crawling spider size in px
  },

  // December: Snow
  snow: {
    count: 90,                           // base snowflake count
    speedMin: 0.8,
    speedMax: 2.2,
    sizeMin: 1.5,
    sizeMax: 4.5,
    wind: 0.3
  },

  // July 1-4: Fireworks
  fireworks: {
    dates: [1, 2, 3, 4],                 // days in July (e.g. [4] for July 4th only)
    launchInterval: 1100,                // ms between rocket launches
    sparkCount: 65,
    colors: ["#FF3366", "#FFFFFF", "#00D4FF", "#FFD700", "#00FF88", "#D154FF", "#FF9100"]
  },

  // February 14: Hearts
  hearts: {
    emojis: ["❤️", "💖", "💕", "💓", "💗", "😍", "🥰", "💘", "💌", "💝"],
    count: 32,
    direction: "up",                     // "up" (floating) or "down" (falling)
    speedMin: 0.9,
    speedMax: 2.2,
    sizeMin: 22,
    sizeMax: 42
  },

  // New Year's: Confetti
  confetti: {
    count: 85,
    speedMin: 2.0,
    speedMax: 4.4,
    colors: ["#FFD700", "#FF4081", "#00E5FF", "#76FF03", "#FF9100", "#E040FB", "#FFFFFF"]
  },

  // St. Patrick's Day: Clovers
  clovers: {
    emojis: ["☘️", "🍀"],
    count: 35,
    speedMin: 1.2,
    speedMax: 2.8,
    sizeMin: 24,
    sizeMax: 44
  },

  // Thanksgiving: Turkeys
  turkeys: {
    emojis: ["🦃"],
    count: 26,
    speedMin: 1.2,
    speedMax: 2.5,
    sizeMin: 28,
    sizeMax: 46,
    thanksgivingType: "us",              // "us" (4th Thursday Nov) or "canadian" (2nd Monday Oct)
    thanksgivingIncludeWeekend: false    // US: Thursday–Sunday, Canadian: Saturday–Monday
  },

  // Christmas: Santas
  santas: {
    emojis: ["🎅", "🤶", "🧑‍🎄"],
    count: 26,
    speedMin: 1.3,
    speedMax: 2.8,
    sizeMin: 28,
    sizeMax: 48,
    combineSnowWithSantas: true          // light snowfall in background
  }
}
```

Speeds are in pixels per 1/60th of a second, so effects move at the same speed on 60 Hz, 75 Hz or 144 Hz displays.

---

## 🎂 Custom Holidays & Anniversaries

Define your own events with `customSchedules`. Use `day` for a single day, or `startDay`/`endDay` for a range within one month. Custom schedules take priority over the built-in holidays.

```javascript
config: {
  customSchedules: [
    {
      name: "Birthday",
      month: 6,
      day: 18,
      effect: "confetti"
    },
    {
      name: "Halloween Party",
      month: 10,
      startDay: 25,
      endDay: 31,
      effect: "spiderwebs"
    }
  ]
}
```

---

## 📡 MagicMirror Notifications

Control the overlay from other modules, e.g. `MMM-Remote-Control`, voice assistants, or motion sensors:

- `OVERLAY_EFFECT_SET`: Show an effect immediately. Without a `duration` it stays until `OVERLAY_EFFECT_RESET`; with one it returns to the calendar schedule afterwards.
  ```javascript
  this.sendNotification("OVERLAY_EFFECT_SET", {
    effect: "fireworks",
    duration: 15000 // optional, in ms
  });
  ```
- `OVERLAY_EFFECT_RESET`: Return to the calendar schedule.
  ```javascript
  this.sendNotification("OVERLAY_EFFECT_RESET");
  ```
- `OVERLAY_EFFECT_TOGGLE`: Turn the overlay off (it stays off until toggled again or reset), or back on to the calendar schedule.
  ```javascript
  this.sendNotification("OVERLAY_EFFECT_TOGGLE");
  ```

---

## 🖥️ Standalone Preview

Open `preview.html` in any modern browser (double-click it, or `firefox preview.html`). It shows a mock mirror with a control bar for choosing an effect, an intensity, or a simulated date, plus a live frame-rate readout. No server is needed.

---

## ⚡ Performance

- **No input blocking**: The overlay uses `pointer-events: none`, so touches and clicks pass through to the modules underneath.
- **Single canvas, one animation loop**: Particle effects draw to one fullscreen 2D canvas using `requestAnimationFrame`.
- **Cached emoji images**: Each emoji is drawn once into a small image and then copied every frame. Redrawing color emoji text every frame is much slower; this makes the emoji effects roughly 3–4x cheaper per frame.
- **Fewer drawing state changes**: Snowflakes with the same opacity are filled together, confetti is grouped by color, and fireworks sparks are reused instead of being created and garbage-collected.
- **Same speed at any refresh rate**: Movement is based on elapsed time, so effects look the same on 60 Hz and high-refresh displays.
- **CSS spider animation**: The spider swing runs as a CSS transform animation on the GPU compositor, with no JavaScript.
- **Pauses when hidden**: Animation stops when MagicMirror hides the module (`suspend()`), for example via a screensaver or a module that hides all modules. Modules that only switch off the HDMI output do not hide modules, so the animation keeps running in that case.

---

## 👥 Contributors

- **bl8demast3r** - Creator & Maintainer
- **Claude** (Anthropic) - AI code review, bug fixes & performance optimization

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
