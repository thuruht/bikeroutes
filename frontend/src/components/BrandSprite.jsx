/* ============================================================
   BrandSprite — the canonical bikeroutes.org vector mark sheet
   ------------------------------------------------------------
   The source of truth for the brand marks is SVG (per the design
   handoff, A7: "vector marks are canonical; PNGs are exports").
   Render <BrandSprite /> once near the app root; then reference
   any mark anywhere with:  <svg><use href="#mark-b" /></svg>

   Symbols:
     #mark-b        b-wheel logomark (stroke)
     #mark-b-solid  b-wheel logomark (filled, for favicons/small)
     #pin-wing      caduceus-wing destination pin
     #reki          full Reki mascot (antlers, cap, bag)
     #reki-head     Reki head — crisp at panel/empty-state sizes
     #reki-sil      Reki silhouette (currentColor)

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
    <circle cx="34" cy="12" r="2.7" fill="#FF6B1A"/>
  </symbol>
  <symbol id="mark-b-solid" viewBox="0 0 40 40">
    <rect x="9.6" y="6" width="5.6" height="28" rx="2.8" fill="currentColor"/>
    <path fill="currentColor" fill-rule="evenodd"
      d="M21 15.4 a9.3 9.3 0 1 1 0 18.6 a9.3 9.3 0 1 1 0-18.6 Z
         M21 20.2 a4.5 4.5 0 1 0 0 9 a4.5 4.5 0 1 0 0-9 Z"/>
    <circle cx="21" cy="24.7" r="2.4" fill="#FF6B1A"/>
  </symbol>
  <symbol id="pin-wing" viewBox="0 0 40 40">
    <g fill="var(--body,#FF6B1A)" stroke="var(--edge,#0B0C08)" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round">
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
  <symbol id="reki" viewBox="0 0 240 240">
    <g stroke="#0B0C08" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round">
      <g fill="none" stroke="#0B0C08" stroke-width="13">
        <path d="M101,82 Q86,54 82,32"/><path d="M90,58 Q77,51 68,45"/><path d="M84,40 Q73,37 64,36"/>
        <path d="M139,82 Q154,54 158,32"/><path d="M150,58 Q163,51 172,45"/><path d="M156,40 Q167,37 176,36"/>
      </g>
      <g fill="none" stroke="#D4A96A" stroke-width="7">
        <path d="M101,82 Q86,54 82,32"/><path d="M90,58 Q77,51 68,45"/><path d="M84,40 Q73,37 64,36"/>
        <path d="M139,82 Q154,54 158,32"/><path d="M150,58 Q163,51 172,45"/><path d="M156,40 Q167,37 176,36"/>
      </g>
      <path d="M90,96 C72,84 54,86 45,99 C55,110 73,113 86,108 Z" fill="#C0763C"/>
      <path d="M150,96 C168,84 186,86 195,99 C185,110 167,113 154,108 Z" fill="#C0763C"/>
      <path d="M85,98 C72,90 60,92 53,100 C61,107 73,108 82,104 Z" fill="#F0D7B0" stroke-width="0"/>
      <path d="M155,98 C168,90 180,92 187,100 C179,107 167,108 158,104 Z" fill="#F0D7B0" stroke-width="0"/>
      <path d="M98,150 C92,176 88,198 88,240 L152,240 C152,198 148,176 142,150 C130,162 110,162 98,150 Z" fill="#C0763C"/>
      <path d="M120,162 C112,184 110,210 112,240 L128,240 C130,210 128,184 120,162 Z" fill="#FFF5E6"/>
      <path d="M101,168 L156,196 L151,208 L96,180 Z" fill="#4B5320"/>
      <rect x="120" y="184" width="13" height="13" rx="2.5" fill="#FF6B1A" transform="rotate(27 126 190)"/>
      <path d="M120,68 C95,68 80,89 80,114 C80,133 90,147 100,157 C107,164 112,170 120,173 C128,170 133,164 140,157 C150,147 160,133 160,114 C160,89 145,68 120,68 Z" fill="#C0763C"/>
      <path d="M120,131 C135,131 145,142 145,153 C145,165 133,173 120,174 C107,173 95,165 95,153 C95,142 105,131 120,131 Z" fill="#FFF5E6"/>
      <ellipse cx="96" cy="138" rx="8" ry="6" fill="#E0905A" stroke-width="0" opacity=".7"/>
      <ellipse cx="144" cy="138" rx="8" ry="6" fill="#E0905A" stroke-width="0" opacity=".7"/>
      <path d="M120,144 C129,144 134,150 131,155 C129,159 123,161 120,161 C117,161 111,159 109,155 C106,150 111,144 120,144 Z" fill="#241A12" stroke-width="3.5"/>
      <ellipse cx="120" cy="149" rx="5" ry="3" fill="#3a2c1f" stroke-width="0"/>
      <ellipse cx="101" cy="113" rx="11" ry="13" fill="#FFF5E6"/>
      <ellipse cx="139" cy="113" rx="11" ry="13" fill="#FFF5E6"/>
      <circle cx="101" cy="114" r="6.5" fill="#241A12" stroke-width="0"/>
      <circle cx="139" cy="114" r="6.5" fill="#241A12" stroke-width="0"/>
      <circle cx="99" cy="111" r="2.1" fill="#FFF5E6" stroke-width="0"/>
      <circle cx="137" cy="111" r="2.1" fill="#FFF5E6" stroke-width="0"/>
      <path d="M90,99 Q101,93 112,98" fill="none" stroke="#9E5E2C" stroke-width="4"/>
      <path d="M128,98 Q139,93 150,99" fill="none" stroke="#9E5E2C" stroke-width="4"/>
      <path d="M86,84 C84,60 101,48 120,48 C139,48 156,60 154,84 C130,77 110,77 86,84 Z" fill="#4B5320"/>
      <path d="M88,82 C70,82 57,88 54,97 C61,99 73,97 84,91 C88,88 90,84 90,82 Z" fill="#39401A"/>
      <path d="M120,48 L120,77" fill="none" stroke="#39401A" stroke-width="3"/>
      <circle cx="120" cy="50" r="3.4" fill="#FF6B1A" stroke-width="2.5"/>
      <path d="M112,63.2 C105.5,61.6 99.5,62.8 95.5,66 C100.5,66 104.5,67 106.8,68.3 C101.5,68.9 97.5,70.2 95,72.2 C100.5,71.1 105.5,70.1 112,67.6 Z" fill="#FFF5E6" stroke-width="2.4"/>
      <path d="M128,63.2 C134.5,61.6 140.5,62.8 144.5,66 C139.5,66 135.5,67 133.2,68.3 C138.5,68.9 142.5,70.2 145,72.2 C139.5,71.1 134.5,70.1 128,67.6 Z" fill="#FFF5E6" stroke-width="2.4"/>
      <path d="M120,59.5 L127.5,68 L120,76.5 L112.5,68 Z" fill="#FF6B1A" stroke-width="2.5"/>
    </g>
  </symbol>
  <symbol id="reki-head" viewBox="34 20 172 172">
    <g stroke="#0B0C08" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round">
      <g fill="none" stroke="#0B0C08" stroke-width="13">
        <path d="M101,82 Q86,54 82,32"/><path d="M90,58 Q77,51 68,45"/><path d="M84,40 Q73,37 64,36"/>
        <path d="M139,82 Q154,54 158,32"/><path d="M150,58 Q163,51 172,45"/><path d="M156,40 Q167,37 176,36"/>
      </g>
      <g fill="none" stroke="#D4A96A" stroke-width="7">
        <path d="M101,82 Q86,54 82,32"/><path d="M90,58 Q77,51 68,45"/><path d="M84,40 Q73,37 64,36"/>
        <path d="M139,82 Q154,54 158,32"/><path d="M150,58 Q163,51 172,45"/><path d="M156,40 Q167,37 176,36"/>
      </g>
      <path d="M90,96 C72,84 54,86 45,99 C55,110 73,113 86,108 Z" fill="#C0763C"/>
      <path d="M150,96 C168,84 186,86 195,99 C185,110 167,113 154,108 Z" fill="#C0763C"/>
      <path d="M85,98 C72,90 60,92 53,100 C61,107 73,108 82,104 Z" fill="#F0D7B0" stroke-width="0"/>
      <path d="M155,98 C168,90 180,92 187,100 C179,107 167,108 158,104 Z" fill="#F0D7B0" stroke-width="0"/>
      <path d="M120,68 C95,68 80,89 80,114 C80,133 90,147 100,157 C107,164 112,170 120,173 C128,170 133,164 140,157 C150,147 160,133 160,114 C160,89 145,68 120,68 Z" fill="#C0763C"/>
      <path d="M120,131 C135,131 145,142 145,153 C145,165 133,173 120,174 C107,173 95,165 95,153 C95,142 105,131 120,131 Z" fill="#FFF5E6"/>
      <ellipse cx="96" cy="138" rx="8" ry="6" fill="#E0905A" stroke-width="0" opacity=".7"/>
      <ellipse cx="144" cy="138" rx="8" ry="6" fill="#E0905A" stroke-width="0" opacity=".7"/>
      <path d="M120,144 C129,144 134,150 131,155 C129,159 123,161 120,161 C117,161 111,159 109,155 C106,150 111,144 120,144 Z" fill="#241A12" stroke-width="3.5"/>
      <ellipse cx="120" cy="149" rx="5" ry="3" fill="#3a2c1f" stroke-width="0"/>
      <ellipse cx="101" cy="113" rx="11" ry="13" fill="#FFF5E6"/>
      <ellipse cx="139" cy="113" rx="11" ry="13" fill="#FFF5E6"/>
      <circle cx="101" cy="114" r="6.5" fill="#241A12" stroke-width="0"/>
      <circle cx="139" cy="114" r="6.5" fill="#241A12" stroke-width="0"/>
      <circle cx="99" cy="111" r="2.1" fill="#FFF5E6" stroke-width="0"/>
      <circle cx="137" cy="111" r="2.1" fill="#FFF5E6" stroke-width="0"/>
      <path d="M90,99 Q101,93 112,98" fill="none" stroke="#9E5E2C" stroke-width="4"/>
      <path d="M128,98 Q139,93 150,99" fill="none" stroke="#9E5E2C" stroke-width="4"/>
      <path d="M86,84 C84,60 101,48 120,48 C139,48 156,60 154,84 C130,77 110,77 86,84 Z" fill="#4B5320"/>
      <path d="M88,82 C70,82 57,88 54,97 C61,99 73,97 84,91 C88,88 90,84 90,82 Z" fill="#39401A"/>
      <path d="M120,48 L120,77" fill="none" stroke="#39401A" stroke-width="3"/>
      <circle cx="120" cy="50" r="3.4" fill="#FF6B1A" stroke-width="2.5"/>
      <path d="M112,63.2 C105.5,61.6 99.5,62.8 95.5,66 C100.5,66 104.5,67 106.8,68.3 C101.5,68.9 97.5,70.2 95,72.2 C100.5,71.1 105.5,70.1 112,67.6 Z" fill="#FFF5E6" stroke-width="2.4"/>
      <path d="M128,63.2 C134.5,61.6 140.5,62.8 144.5,66 C139.5,66 135.5,67 133.2,68.3 C138.5,68.9 142.5,70.2 145,72.2 C139.5,71.1 134.5,70.1 128,67.6 Z" fill="#FFF5E6" stroke-width="2.4"/>
      <path d="M120,59.5 L127.5,68 L120,76.5 L112.5,68 Z" fill="#FF6B1A" stroke-width="2.5"/>
    </g>
  </symbol>
  <symbol id="reki-sil" viewBox="0 0 120 120">
    <g fill="currentColor" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
      <g stroke-width="7" fill="none">
        <path d="M44,66 L34,101"/>
        <path d="M52,68 Q49,86 60,100"/>
        <path d="M82,66 L92,101"/>
        <path d="M74,68 Q72,86 64,100"/>
      </g>
      <ellipse cx="60" cy="58" rx="31" ry="17" transform="rotate(-7 60 58)"/>
      <ellipse cx="40" cy="57" rx="16" ry="15"/>
      <ellipse cx="80" cy="58" rx="14" ry="14"/>
      <path d="M28,50 Q22,32 29,28 Q35,38 33,52 Z" stroke-width="1"/>
      <path d="M82,52 L92,30 L102,34 L92,60 Z" stroke-width="1"/>
      <ellipse cx="101" cy="29" rx="13.5" ry="7.5" transform="rotate(-33 101 29)"/>
      <path d="M92,26 L86,15 L96,23 Z" stroke-width="1"/>
      <g stroke-width="3.4" fill="none">
        <path d="M100,20 Q98,9 105,5"/>
        <path d="M101,16 Q108,11 113,11"/>
        <path d="M104,11 Q110,7 115,6"/>
      </g>
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
