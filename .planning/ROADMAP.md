# Margarita App - Roadmap

## Phase 1: Base Integration & Color Engine
**Goal:** Port the Figma Make design and implement the color extraction functionality.
- [ ] Initialize directory structure (`src/app/pages`, `src/app/utils`).
- [ ] Port `EditorPage.tsx`, `colorExtractor.ts`, and `storage.ts`.
- [ ] Integrate Tailwind CSS v4 and base styles.
- [ ] **Validation:** Verify image upload and color extraction on the canvas.

## Phase 2: Calligraphy Motor & Sticker Generation
**Goal:** Implement the custom font system and PNG export.
- [ ] Create Font Upload utility.
- [ ] Implement `FontLab` modal for text entry.
- [ ] Develop the Canvas rendering logic for stickers (PNG with alpha).
- [ ] **Validation:** Generate and download a white sticker with a custom font.

## Phase 3: Supabase & Persistence
**Goal:** Move from local storage to cloud persistence.
- [ ] Setup Supabase project and client.
- [ ] Implement Auth flow (LoginPage).
- [ ] Migrate `storage.ts` to Supabase DB and Storage Buckets.
- [ ] Implement the "Projects" (HomePage) grid.

## Phase 4: Refinement & Onboarding
**Goal:** Polish the UX and add the guided tutorial.
- [ ] Implement the interactive onboarding (Joyride/Wizard).
- [ ] Refine 'Vaporwave Airy' transitions and animations (Framer Motion).
- [ ] Final E2E testing.
