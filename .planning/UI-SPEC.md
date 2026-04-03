**UI-SPEC — Split It (Phase 1: Onboarding + Theme)**

- **Goal:** Build a minimal, Apple-like onboarding that showcases the new light theme (lavender accents). Provide clear, large typography and an accessible CTA.

- **Brand tokens:**
  - Accent (lavender): #6D28D9
  - Accent Light: #A78BFA
  - Background (light): #FFFFFF
  - Surface: #F7F6FB / #F2EEF9 (cards)
  - Primary text: #0B1220
  - Secondary text: #475569

- **Typography:**
  - H1 / Large Title: 34-36px, weight 800, tight leading (Apple-style large title)
  - Body: 17-18px, weight 400-500, 1.4 line-height
  - Buttons: 16-18px, weight 700
  - Small labels: 13-14px (use sparingly)

- **Spacing / radii:**
  - Base spacing scale in `SPACING` used across (xs..xxl)
  - Card radius: 20-24 for large surfaces
  - Button radius: pill (RADIUS.xl)

- **Buttons:**
  - Prefer filled primary buttons with high contrast white text on lavender.
  - Secondary actions use softer filled accent (accentLight) with white text.
  - Avoid thin bordered buttons for primary flows.

- **Iconography:**
  - Use single-color glyphs inside rounded squares or circles with the accent color background and white icon to create strong visual anchors.

- **Onboarding specifics:**
  - 3 screens: core problem, how Split It helps, settlement.
  - Large title centered, short body copy, strong single CTA.
  - Progress indicators are subtle pills (active pill wider).
  - CTA pinned near bottom with safe-area padding.

- **Theme:**
  - Persisted theme via `useThemeStore` (AsyncStorage).
  - Default for onboarding screens: light theme to showcase new variant.
  - Theme switch available in Profile → Settings (light/dark now).

- **Accessibility:**
  - Minimum touch target: 44x44 for interactive elements.
  - Sufficient color contrast for text and buttons (WCAG AA recommended).
  - Ensure `accessibilityLabel` and `accessible` where appropriate.

- **Developer notes:**
  - Use `THEMES.light` tokens for onboarding visuals so they are independent of runtime theme preference.
  - Keep `Button` component as single source of truth for primary controls — ensure it follows theme tokens.
  - Grouping and ordering of expense lists implemented in `app/group/[id]/index.tsx` using SectionList.

- **Next steps:**
  1. Review onboarding visuals and copy.
  2. Apply same light-themed tokens to Dashboard wireframe.
  3. Iterate on typography scale (global increase) if you want larger UI overall.

*Created by design automation: implemented light-theme onboarding + theme store. Request further iterations for Dashboard / Activity.*
