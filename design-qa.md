# Later Card Design QA

## Evidence

- Source visual truth: `C:\Users\Marion\AppData\Local\Temp\codex-clipboard-43b6db8b-19b3-4040-8b8b-32b321c73024.png`
- Normalized source: `C:\Users\Marion\Documents\Projects\later-card\qa\source-normalized.png`
- Browser-rendered implementation: `C:\Users\Marion\Documents\Projects\later-card\qa\implementation-pass-2.png`
- Final side-by-side comparison: `C:\Users\Marion\Documents\Projects\later-card\qa\comparison-pass-2.png`
- Viewport: 1400 x 1200 browser stage with an unscaled 393 x 852 iPhone app screen
- Device scale factor: 1
- Source pixels: 852 x 1836, center-cropped by 5 pixels and normalized to 393 x 852
- Implementation pixels: 393 x 852
- State: default Vivid background, 0-degree hue, white text, `One month later...`

## Full-view comparison

The final side-by-side comparison shows the same single-column mobile hierarchy as the source: centered display-font title, large rounded 4:3 preview, direct phrase editing, circular background rail, and large full-width export action. The requested hue control is intentionally inserted directly under the preview. The source's warm cream and olive palette is intentionally replaced by white and ocean blue. Visible copy is English-only.

The source is a full-page mobile capture while the implementation is a fixed 393 x 852 device viewport. The secondary Share action remains available immediately below the first viewport through vertical scrolling; this is an expected consequence of adding the requested hue control without shrinking the preview.

## Focused-region comparison

A separate crop was not needed because the normalized 393 x 852 comparison keeps the display font, preview imagery, hue control, phrase field, text-color segment, background thumbnails, and primary action readable at 1:1. The generated background remains sharp at the preview crop and the local Some Time Later font is visibly loaded in both the title and card phrase.

## Required fidelity surfaces

- Fonts and typography: Some Time Later is used for the app title and generated phrase; compact Roboto UI typography preserves the source hierarchy. No fallback-font flash remained in the final capture.
- Spacing and layout rhythm: centered title, large 4:3 preview, compact sections, rounded input, circular background rail, and full-width actions match the source structure. The hue panel is a deliberate new block.
- Colors and tokens: white base, dark ink, and a saturated ocean-blue accent are consistently mapped to borders, selection rings, slider thumb, and actions.
- Image quality and assets: both generated 1448 x 1086 master images are used directly. Preview and PNG rendering use cover crop without stretching.
- Copy and content: all app-specific visible copy is English. Labels clearly identify Hue, Phrase, text color, Background, Save PNG, and Share.

## Comparison history

### Pass 1

- [P1] Simulated keyboard remained open after the phrase field lost focus.
  - Evidence: `qa\comparison-pass-1.png` showed the keyboard obscuring the background rail and actions.
  - Impact: this made the core export flow awkward on mobile.
  - Fix: connected `KeyboardInput` blur to the protected runtime's `keyboard.hide()` action.

### Pass 2

- Post-fix evidence: `qa\comparison-pass-2.png`
- The keyboard is closed in the default state and a browser interaction test confirmed `data-visible` changes from `true` to `false` after moving from Phrase to Charcoal.
- No actionable P0, P1, or P2 visual differences remain.

## Interaction and runtime checks

- Phrase entry: passed
- Hue slider: passed
- White / Charcoal text selection: passed
- Vivid / Pastel preset selection: passed
- Upload image: passed; uploaded image became `My photo`
- PNG rendering: passed; app reported `PNG saved.`
- Share: control invoked; native share-sheet completion cannot be inspected by browser automation, and the unsupported-browser fallback is implemented as PNG download
- Console warnings and errors: none
- Mobile runtime integrity: passed for all 28 protected files
- Production build: passed
- Static hosting compatibility tests: 4 passed

## Findings

No actionable P0, P1, or P2 findings remain.

## Follow-up polish

- [P3] After J chooses additional master backgrounds, the three empty preset slots can be populated without changing the layout.

final result: passed
