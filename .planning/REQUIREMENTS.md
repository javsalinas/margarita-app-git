# Margarita App - Requirements

## 1. Functional Requirements

### 1.1 Intelligent Color Palette (Staple)
- [ ] **Image Upload:** Support for high-res JPG/PNG files.
- [ ] **Color Extraction:** Automatically extract 5-6 dominant colors using canvas quantization.
- [ ] **Interaction:** 
  - **Long Press (500ms):** Activate dragging mode.
  - **Drag:** Reposition the palette anywhere on the canvas.
  - **Tap:** Open color detail modal with HEX code and copy button.

### 1.2 Pro Calligraphy Motor
- [ ] **Font Upload:** Allow users to upload .TTF, .OTF, or .WOFF files.
- [ ] **Text Input:** Field to enter text for sticker generation.
- [ ] **Sticker Generation:** 
  - Render text using the custom font on a transparent canvas.
  - Output: High-quality PNG with alpha channel.
  - Variants: Solid Black and Solid White.
- [ ] **Application:** Overlay the sticker on the canvas or download for external use.

### 1.3 Canvas & Composition
- [ ] **Formats:** Support 9:16 (Story), 1:1 (Square), and 4:5 (Feed).
- [ ] **Project Management:** Save/Load projects including image, colors, and palette position.

### 1.4 Persistence & Auth
- [ ] **Login:** Social login (Google/GitHub) via Supabase.
- [ ] **Cloud Storage:** Save custom fonts and design history to Supabase buckets.

## 2. Technical Requirements
- **Performance:** Image processing must happen in the client (Web Workers if necessary for high-res).
- **UI:** Maintain the '90s Vaporwave Airy' vibe with a clean, functional layout based on `Margaritaappdesignflow`.
- **Accessibility:** Keyboard shortcuts for common actions (Copy, Save).
