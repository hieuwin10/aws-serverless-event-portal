---
name: Aetheric Space
colors:
  surface: '#0f131d'
  surface-dim: '#0f131d'
  surface-bright: '#353944'
  surface-container-lowest: '#0a0e18'
  surface-container-low: '#171b26'
  surface-container: '#1c1f2a'
  surface-container-high: '#262a35'
  surface-container-highest: '#313540'
  on-surface: '#dfe2f1'
  on-surface-variant: '#dbc2ad'
  inverse-surface: '#dfe2f1'
  inverse-on-surface: '#2c303b'
  outline: '#a38d7a'
  outline-variant: '#554434'
  surface-tint: '#ffb86f'
  primary: '#ffc082'
  on-primary: '#4a2800'
  primary-container: '#ff9900'
  on-primary-container: '#653a00'
  inverse-primary: '#8a5100'
  secondary: '#ddfcff'
  on-secondary: '#00363a'
  secondary-container: '#00f1fe'
  on-secondary-container: '#006a70'
  tertiary: '#d7c3ff'
  on-tertiary: '#3d008f'
  tertiary-container: '#bfa2ff'
  on-tertiary-container: '#5500c1'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdcbd'
  primary-fixed-dim: '#ffb86f'
  on-primary-fixed: '#2c1600'
  on-primary-fixed-variant: '#693c00'
  secondary-fixed: '#74f5ff'
  secondary-fixed-dim: '#00dbe7'
  on-secondary-fixed: '#002022'
  on-secondary-fixed-variant: '#004f54'
  tertiary-fixed: '#eaddff'
  tertiary-fixed-dim: '#d1bcff'
  on-tertiary-fixed: '#24005b'
  on-tertiary-fixed-variant: '#5800c8'
  background: '#0f131d'
  on-background: '#dfe2f1'
  surface-variant: '#313540'
typography:
  display-lg:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 48px
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The design system is engineered for high-stakes event management, evoking the vast, organized complexity of a deep-space interface. It targets industry leaders who require a high-performance environment that feels premium, authoritative, and futuristic.

The aesthetic follows a **Glassmorphic** approach layered over a "Space Dark" foundation. It prioritizes depth through transparency and backdrop blurs, punctuated by high-contrast neon accents that guide the eye toward critical actions. The interface should feel like a high-end command center—precise, expansive, and immersive. Visual interest is driven by subtle background "glowing orbs" that shift slowly, creating a sense of life without distracting from data-heavy tasks.

## Colors

The palette is anchored in a deep **Space Dark** (#0B0F19) to ensure maximum contrast for glass layers. The **Primary Accent** is AWS Orange, used exclusively for primary calls to action and critical status indicators to ensure they "pop" against the dark void.

- **Primary:** AWS Orange (#FF9900) - For energy and urgency.
- **Secondary:** Electric Cyan (#00F2FF) - For data visualization and secondary interactions.
- **Tertiary:** Nebula Purple (#8C52FF) - For decorative elements and highlighting premium features.
- **Functional:** Success (Emerald), Warning (Amber), Error (Crimson) are rendered in high-saturation neon variants to maintain the futuristic vibe.

## Typography

This design system utilizes a dual-font strategy to balance character with utility. 

**Outfit** is used for headlines and display text. Its geometric, wide apertures provide a modern, technical look that feels expansive. 

**Inter** is utilized for all body, UI labels, and data entry. Its high legibility and neutral tone provide the necessary clarity for managing complex event logistics. 

Labels should often use a slight letter-spacing increase and uppercase styling to mimic technical readouts.

## Layout & Spacing

The layout follows a rigorous **Fixed Grid** model on desktop (12 columns) and a fluid model on mobile (4 columns). A strict 4px baseline grid ensures mathematical precision across all components.

- **Desktop:** 12 columns, 24px gutters, 32px side margins.
- **Tablet:** 8 columns, 16px gutters, 24px side margins.
- **Mobile:** 4 columns, 16px gutters, 16px side margins.

Containers should utilize the maximum width for dashboards but transition to centered, narrow stacks for administrative forms. Information density is kept high, but balanced by generous "outer" margins to prevent the UI from feeling claustrophobic.

## Elevation & Depth

Depth is not communicated through traditional shadows, but through **cumulative opacity** and **backdrop filters**.

1.  **Base Layer:** The solid #0B0F19 background.
2.  **Mantle Layer:** Glowing radial gradients (15-20% opacity) in Cyan or Purple that sit behind the glass layers.
3.  **Surface Layer:** Background `rgba(255, 255, 255, 0.03)` with a `blur(12px)`.
4.  **Raised Layer:** Used for modals and dropdowns. Increase background opacity to `0.08` and add a subtle outer glow using the primary color at 10% opacity instead of a black shadow.

All glass panels must have a `1px solid rgba(255, 255, 255, 0.08)` border to define their edges against the dark background.

## Shapes

The shape language is consistently "Soft-Geometric." 

Main containers, cards, and input fields use a **12px (0.75rem)** corner radius. Smaller elements like tags or nested buttons use **8px**. This rounding prevents the "Space" theme from feeling too cold or aggressive, adding a layer of premium approachability. Interactive elements should never be fully sharp or fully pill-shaped (unless they are specific status chips).

## Components

### Buttons
- **Primary:** Solid AWS Orange background with black text for maximum legibility. On hover, add a `0 0 20px rgba(255, 153, 0, 0.4)` outer glow.
- **Secondary:** Glass background with a white border and white text.
- **Ghost:** No background, primary color text, highlighted with a subtle glass tint on hover.

### Input Fields
Inputs are semi-transparent glass with 12px rounding. The active state is signaled by a 1px primary orange border and a very subtle inner glow.

### Cards
Cards are the primary container unit. They must feature the 12px blur and the 1px subtle white border. For "featured" event cards, use a top-border accent in the secondary cyan color.

### Chips & Badges
Small, high-contrast pills. Use semi-transparent versions of functional colors (e.g., Green text on a 10% green background) to maintain the glass effect without losing color coding.

### Micro-animations
All interactive states should have a 200ms ease-out transition. Hovering over a card should slightly increase the backdrop blur and the border opacity to create a "lifting" effect.