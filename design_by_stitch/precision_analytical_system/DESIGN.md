---
name: Precision Analytical System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434656'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737688'
  outline-variant: '#c3c5d9'
  surface-tint: '#004dea'
  primary: '#0041c8'
  on-primary: '#ffffff'
  primary-container: '#0055ff'
  on-primary-container: '#e3e6ff'
  inverse-primary: '#b6c4ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#4d5052'
  on-tertiary: '#ffffff'
  tertiary-container: '#65686a'
  on-tertiary-container: '#e5e8ea'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b3'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
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
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 24px
  margin: 32px
  max-width: 1440px
---

## Brand & Style

The design system is engineered for high-performance PDF analysis and professional reporting. It embodies a **"Smart and Simple"** philosophy, prioritizing cognitive clarity and rapid information retrieval. The brand personality is authoritative yet approachable—a reliable partner for complex data extraction.

The aesthetic leans into **Modern Minimalism** with a **Corporate/Functional** edge. By utilizing generous whitespace and a restrained color palette, the interface reduces "visual noise," allowing the user’s content to remain the primary focus. Every element is intentional, designed to facilitate a state of flow for analysts and researchers.

## Colors

The palette is anchored by **Deep Slate (#0F172A)**, providing a sophisticated foundation for typography and structural elements. **Vibrant Action Blue (#0055FF)** serves as the primary driver for interactivity, guiding the eye toward calls-to-action and active states. 

**Crisp White (#FFFFFF)** and its secondary derivative **Slate-50 (#F8FAFC)** are used for surface layering to create a clean, breathable environment. Functional status colors (Success, Warning, Error) should be used sparingly, maintaining a high-contrast ratio against the neutral background to ensure accessibility and clarity in reporting.

## Typography

The design system utilizes **Inter** exclusively to leverage its exceptional legibility and systematic structure. The hierarchy is strictly defined to help users distinguish between document metadata, analysis results, and interface controls.

- **Headlines:** Use tighter letter-spacing and semi-bold weights to create a strong visual anchor.
- **Body Copy:** Optimized for long-form reading during report analysis, utilizing a 1.5x line-height for maximum readability.
- **Labels:** Small caps or medium weights are used for data tags and table headers to provide a distinct "utility" feel without competing with the primary content.

## Layout & Spacing

The layout follows a **Fluid Grid** model with a maximum content width of 1440px. A 12-column system is used for dashboard layouts, while document viewing areas typically employ a split-pane model (Fixed Sidebar + Fluid Content).

- **Desktop:** 24px gutters and 32px outer margins.
- **Tablet:** 16px gutters and 24px margins.
- **Mobile:** 16px margins, switching to a single-column stacked layout.

The spacing rhythm is based on an **8px scale**. Generous "Safe Areas" (32px+) are used around critical analysis components to prevent cognitive overload and emphasize a "smart," uncluttered environment.

## Elevation & Depth

This design system uses **Tonal Layering** combined with **Ambient Shadows** to communicate hierarchy. Surfaces are categorized into three tiers:

1.  **Level 0 (Background):** Slate-50 (#F8FAFC) - The canvas.
2.  **Level 1 (Cards/Panels):** White (#FFFFFF) - Used for primary content containers. These feature a subtle 1px border (#E2E8F0) and a soft, low-opacity shadow (0 4px 12px rgba(15, 23, 42, 0.05)).
3.  **Level 2 (Popovers/Modals):** White (#FFFFFF) - Floating elements with more pronounced shadows (0 12px 24px rgba(15, 23, 42, 0.1)) to indicate focus and separation.

Shadow colors should always be tinted with the Deep Slate primary to maintain a cohesive, professional "ink-on-paper" depth.

## Shapes

The shape language is refined and approachable. A **Rounded (8px base)** corner radius is applied to standard components like input fields, buttons, and small cards. 

- **Containers/Cards:** Use `rounded-lg` (16px) to create a soft, distinct containment for data sets.
- **Interaction Elements:** Buttons and form fields use the standard 8px radius to maintain a professional, tool-like appearance.
- **Chips/Status Tags:** Use `rounded-xl` (24px) or full pill shapes to distinguish them from actionable buttons.

## Components

- **Buttons:** Primary buttons are Solid Action Blue with white text. Secondary buttons use a Ghost style (Slate text, no fill) or a light Slate-100 background.
- **Input Fields:** Minimalist borders (1px Slate-200) that transition to 2px Action Blue on focus. Labels sit above the field in `label-md`.
- **Cards:** White backgrounds with `rounded-lg` corners. Use for document previews and report summaries. 
- **PDF Viewer Controls:** Floating toolbars with backdrop-blur effects (Glassmorphism) to ensure they remain legible over varied document content.
- **Progress Bars:** Thin, high-contrast bars using the Action Blue to show analysis status or upload progress.
- **Data Tables:** Clean, border-less rows with subtle dividers and `label-sm` headers for a dense but readable information display.