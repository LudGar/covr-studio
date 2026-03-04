# COVR STUDIO
### Single-file HTML magazine cover builder — no install, no server, no dependencies to manage.

Open `magazine-builder.html` in any modern browser and start building.

---

## Panels

The workspace shows three panels side by side — **Front Cover**, **Spine**, and **Back Cover** — exactly as they would appear on a printed magazine spread. Use the tabs at the top to view all three at once or isolate a single panel.

---

## Images

### Front Cover
- **Front Background** — a base layer behind everything, fills the full cover with object-fit cover scaling.
- **Main Cover Image** — supports transparent PNGs. Sits above the background with its own opacity slider (0–100%) and vertical position slider (0–100%) so you can frame the subject precisely.
- **Logo / Brand Mark** — when uploaded, replaces the text masthead on the front cover. PNG with transparency recommended. Removing it restores the text title.

### Spine
- **Spine Background (full)** — covers the entire spine behind all text.
- **Spine Bottom Image** — a small emblem drawn just above the issue label at the bottom of the spine.

### Back Cover
- **Back Cover Image** — full-bleed background for the back panel.

Every image slot has a **× delete button** that clears the image and restores the placeholder. All images are compressed and saved per-issue (see Storage section).

---

## Text & Content

All text elements can be edited two ways: type in the **sidebar inputs**, or click directly on the text **on the cover** to edit inline. Press Enter or click away to confirm.

### Global (syncs to all panels)
- **Magazine Title** — updates the front masthead, spine title, and back brand simultaneously. Font size auto-shrinks to fit on one line; the title never wraps.
- **Issue / Volume** — updates the front top-left label and the spine bottom label.
- **Date** — updates the front top-right label and the spine top label.

### Front Cover
- Tagline, Cover Headline, Subheadline, Bottom Teaser

### Back Cover
- Back Tagline, Blurb / Description, Website, Price / Edition, Legal Text

---

## Alignment

Both the **Title** and the **Tagline** on the front cover have four alignment buttons:

| Button | Effect |
|--------|--------|
| L | Left-align |
| C | Center-align |
| R | Right-align |
| ≡ | Justify |

---

## Spine

- **BG Color** — solid background color for the spine.
- **Text Color** — applies to all spine text (title, date, issue).
- **Issue / Volume Rotation** — three options:
  - Along spine ↓ (clockwise, reads top to bottom)
  - Along spine ↑ (counter-clockwise, reads bottom to top)
  - Horizontal (across the spine width)
- **Hide date from spine** — removes the date from the spine while keeping it visible on the front cover.

The spine is rendered entirely on an HTML Canvas so text, images, and layout are always crisp and pixel-accurate on export.

---

## Style

- **Title Font** — choose between Bebas Neue, Playfair Display, or Cormorant Garamond. Applies to the front masthead, back brand, and spine title.
- **Title Color** — color picker plus four quick-select swatches (white, gold, red, black).
- **Overlay Intensity** — gradient overlay strength on the front cover (0–100%).
- **Solid BG Color** — the fallback solid color shown behind all front cover layers.
- **Back Cover Tint** — solid background color for the back cover.
- **Show / Hide Barcode** — toggles a real functional CODE128 barcode on both the front and back covers.

---

## Multi-Issue Management

### Issue Stepper (sidebar)
The sidebar shows a `‹ Issue 2 / 5 ›` stepper. Clicking the arrows saves the current issue and loads the adjacent one. Each issue stores its own text, settings, and images independently.

- **Duplicate** — copies the current issue with an auto-incremented volume number and date bumped by one month.
- **Manage Issues ↗** — opens the full Issues panel.

### Issues Panel (tab)
A grid of cards showing every issue in the project. Each card displays the magazine title, date, and volume label. The currently active issue is marked "Editing."

- **Edit** — loads that issue into the design workspace.
- **Delete** — removes the issue (at least one must always remain).

### Generate Series
Opens a dialog to auto-generate a full run of issues at once:

| Setting | Options |
|---------|---------|
| Start Volume # | any number |
| Number of Issues | up to 48 |
| Start Month | January – December |
| Start Year | any year |
| Release Cadence | Monthly · Bi-monthly · Quarterly · Bi-annually |
| Volume Label Style | Vol. N · No. N · Issue N · #N |

---

## Output Size & Resolution

### Magazine Size
Thirteen standard formats across five regional groups:

| Group | Formats |
|-------|---------|
| International | A3, A4, A5 |
| North America | Letter, US Magazine, US Digest, Tabloid |
| Europe / UK | UK Standard, B5 |
| Asia / Japan | B5 JIS, B4 JIS |
| Square / Other | Square 210 mm, Square 300 mm |

Changing the format immediately resizes the preview panels to the correct aspect ratio using a uniform CSS scale — every font, image, and layout element scales proportionally with no distortion.

### DPI
Six resolution presets: 72 · 96 · 150 · 300 · 400 · 600 dpi.

### Output Info Box
Shows the exact pixel dimensions that will be exported for the current size + DPI combination:
- Front / Back (e.g. `2550 × 3300 px` at Letter 300 dpi)
- Spine
- Total spread (both covers + spine combined)

---

## Download

Each panel has its own **↓ Download** button. **↓ Download All** exports all three panels in sequence.

Downloads are rendered directly to a Canvas at the full output resolution derived from your chosen magazine size and DPI — completely independent of the preview scale. Images are drawn using proper object-fit cover logic with the exact position/opacity settings from the editor.

---

## Local Storage & Persistence

### Auto-save
The project is automatically saved to your browser's localStorage 1.8 seconds after any change — text edits, image uploads, setting changes, or switching issues all trigger a save. The **storage bar** at the top of the window shows:
- Current storage usage (KB or MB) with a fill bar
- A warning color at 70% usage, red at 90%
- Live status ("Unsaved changes…" / "Saved 3:42 PM")

### Restore on Reload
When you reopen the file, if a saved project is found a **Restore Session** dialog appears showing the issue count, save timestamp, and file size. Choose to restore or start fresh.

### Manual Controls (storage bar)
| Button | Action |
|--------|--------|
| Save Now | Force an immediate save |
| Export JSON | Download the full project as a `.json` file (includes all images as base64) |
| Import JSON | Load a previously exported `.json` project file |
| Clear | Delete all saved data from localStorage |

### Image Storage
Images are compressed before saving — photos are stored as JPEG at 78% quality, transparent PNGs are stored losslessly. The max dimension is capped at 1600 px on the longest side to keep storage lean. Each issue stores its own independent set of images, so every cover in a series can have a different photo.

---

## Keyboard & Interaction

- **Click any text on the cover** to edit it inline.
- **Enter** confirms an inline edit and deselects the field.
- **Drag and drop** images directly onto any upload zone.
- The **× button** on each image zone clears that image.
- Inline title edits auto-shrink the font size to prevent wrapping.

---

## Technical Notes

- Single self-contained `.html` file — no build step, no server required.
- External dependencies loaded from CDN: Google Fonts, JsBarcode.
- The spine is rendered on an HTML `<canvas>` element at device pixel ratio for crisp display.
- Preview scaling uses `transform: scale()` with a uniform scale factor — the design canvas stays at fixed design dimensions (420 × 560 px) internally, so all layout values remain stable regardless of window size.
- Downloads use a custom Canvas renderer that reads positions from the live DOM, guaranteeing the exported file matches what you see on screen.
