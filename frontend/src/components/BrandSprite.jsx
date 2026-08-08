/* ============================================================
   BrandSprite — canonical bikeroutes.org vector mark sheet
   ------------------------------------------------------------
   Render <BrandSprite /> once near the app root; then reference
   any mark anywhere with:  <svg><use href="#mark-b" /></svg>

   Symbols:
     #mark-b        b-wheel logomark (stroke)
     #mark-b-solid  b-wheel logomark (filled, for favicons/small)
     #pin-wing      caduceus-wing destination pin
     #cowboy-hat    hat mark used as the dot of the i in the wordmark

   Kept as raw SVG markup (dangerouslySetInnerHTML) so the
   hand-tuned paths/attributes survive verbatim without a
   kebab→camelCase JSX rewrite.
   ============================================================ */

const SPRITE = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <symbol id="mark-b" viewBox="0 0 40 40">
    <g fill="none" stroke="currentColor" stroke-width="2.9" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12.5 7 L12.5 32"/>
      <circle cx="21.5" cy="24.5" r="8"/>
      <path d="M28 19 L33 13.5"/>
    </g>
    <circle cx="21.5" cy="24.5" r="1.9" fill="currentColor"/>
    <circle cx="12.5" cy="7" r="2.6" fill="currentColor"/>
    <circle cx="34" cy="12" r="2.7" fill="var(--ac, #7a9a8c)"/>
  </symbol>
  <symbol id="mark-b-solid" viewBox="0 0 40 40">
    <rect x="9.6" y="6" width="5.6" height="28" rx="2.8" fill="currentColor"/>
    <path fill="currentColor" fill-rule="evenodd"
      d="M21 15.4 a9.3 9.3 0 1 1 0 18.6 a9.3 9.3 0 1 1 0-18.6 Z
         M21 20.2 a4.5 4.5 0 1 0 0 9 a4.5 4.5 0 1 0 0-9 Z"/>
    <circle cx="21" cy="24.7" r="2.4" fill="var(--ac, #7a9a8c)"/>
  </symbol>
  <symbol id="pin-wing" viewBox="0 0 40 40">
    <g fill="var(--body,#7a9a8c)" stroke="var(--edge,#0b0c08)" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round">
      <ellipse cx="12.2" cy="12.4" rx="3.1" ry="9.8" transform="rotate(-63 12.2 12.4)"/>
      <ellipse cx="14.4" cy="15.2" rx="3" ry="8.4" transform="rotate(-46 14.4 15.2)"/>
      <ellipse cx="16.5" cy="17.8" rx="2.8" ry="7" transform="rotate(-30 16.5 17.8)"/>
      <ellipse cx="27.8" cy="12.4" rx="3.1" ry="9.8" transform="rotate(63 27.8 12.4)"/>
      <ellipse cx="25.6" cy="15.2" rx="3" ry="8.4" transform="rotate(46 25.6 15.2)"/>
      <ellipse cx="23.5" cy="17.8" rx="2.8" ry="7" transform="rotate(30 23.5 17.8)"/>
      <path d="M20 35.8 L19.1 33 L19.1 14 Q20 12 20.9 14 L20.9 33 Z"/>
      <circle cx="20" cy="10.4" r="2.4"/>
    </g>
  </symbol>
  <symbol id="cowboy-hat" viewBox="0 0 120 80">
    <g fill="currentColor" stroke="none">
      <!-- crown -->
      <path d="M38 50 C38 22 55 14 74 14 C93 14 104 24 98 50 Z" />
      <!-- brim -->
      <path d="M14 52 C14 44 42 44 74 42 C106 44 114 44 114 52 C114 64 90 72 64 74 C38 72 14 64 14 52 Z" />
      <!-- hat band -->
      <rect x="42" y="42" width="52" height="6" rx="2" fill="#fff" opacity="0.25" />
    </g>
  </symbol>
</svg>`;

export default function BrandSprite() {
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      dangerouslySetInnerHTML={{ __html: SPRITE }}
    />
  );
}
