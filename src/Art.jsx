import React from 'react';
import './course-art.css';

export function BrandMark({ small = false }) {
  return <svg width={small ? 25 : 34} height={small ? 25 : 34} viewBox="0 0 36 36" fill="none" aria-hidden="true"><path d="M27 9.5a12 12 0 1 0 0 17" stroke="currentColor" strokeWidth="6" strokeLinecap="round"/><circle cx="28" cy="18" r="3.5" fill="currentColor"/></svg>;
}

export function HeroArt() {
  return <svg className="hero-art" viewBox="0 0 460 320" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="planet" x1="186" y1="79" x2="326" y2="250" gradientUnits="userSpaceOnUse"><stop stopColor="#edf7ae"/><stop offset="1" stopColor="#accf76"/></linearGradient>
      <linearGradient id="block" x1="40" y1="245" x2="149" y2="287"><stop stopColor="#98b69a"/><stop offset="1" stopColor="#789b84"/></linearGradient>
      <clipPath id="planet-clip"><circle cx="260" cy="156" r="87"/></clipPath>
    </defs>
    <circle cx="260" cy="156" r="123" stroke="#7b9e85" strokeOpacity=".2" strokeDasharray="3 7"/>
    <circle cx="260" cy="156" r="87" fill="url(#planet)"/>
    <g clipPath="url(#planet-clip)" stroke="#537d4a" strokeOpacity=".55" strokeWidth="1.1">
      <ellipse cx="260" cy="156" rx="32" ry="87"/><ellipse cx="260" cy="156" rx="65" ry="87"/>
      <ellipse cx="260" cy="156" rx="87" ry="28"/><ellipse cx="260" cy="156" rx="87" ry="60"/>
      <path d="M172 156h176M260 68v177"/>
    </g>
    <ellipse cx="260" cy="157" rx="148" ry="46" transform="rotate(-32 260 157)" stroke="#376447" strokeWidth="1.5"/>
    <circle cx="375" cy="81" r="13" fill="#f3c6ae" stroke="#376447" strokeWidth="1.2"/>
    <circle cx="141" cy="232" r="9" fill="#33583d"/>
    <g transform="translate(63 204) rotate(-8)"><path d="M0 30 48 6l48 24-48 25L0 30Z" fill="#c8d9c3"/><path d="m0 30 48 25v45L0 75V30Z" fill="url(#block)"/><path d="m48 55 48-25v45l-48 25V55Z" fill="#668b73"/><path d="m0 53 48 24 48-25M24 18l48 25v45M24 42v46M48 55V8M72 43v45" stroke="#446d55" strokeOpacity=".6"/></g>
    <g transform="translate(77 55) rotate(-9)"><rect width="115" height="39" rx="10" fill="#f7f9ee" stroke="#c4d6c0"/><text x="15" y="25" fontFamily="Georgia,serif" fontSize="18" fill="#416548">a² + b² = c²</text></g>
    <g transform="translate(316 238) rotate(7)"><rect width="106" height="38" rx="11" fill="#f7f9ee" stroke="#c4d6c0"/><text x="18" y="24" fontFamily="DM Sans,sans-serif" fontSize="15" fill="#416548">What if…?</text></g>
    <path d="m367 161 9 16 17-8-5 18 18 5-17 8 8 17-18-5-5 18-8-17-17 8 5-18-18-5 17-8-8-17 18 5 4-17Z" fill="#e5ae97"/>
    <path d="M117 132v23m-11-11h23M381 37v15m-7-7h15" stroke="#638466" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="195" cy="285" r="3" fill="#638466"/><circle cx="324" cy="44" r="3" fill="#638466"/>
    <path d="M396 286c-5-15-19-17-26-13 3 12 14 17 26 13ZM396 286c1-17 12-25 22-23 0 14-8 22-22 23Z" fill="#7f9f76"/>
  </svg>;
}

export function CourseArt({ type, className = '' }) {
  return <svg className={`course-art ${className}`} viewBox="0 0 360 180" fill="none" aria-hidden="true">
    {type === 'biology' && <g stroke="var(--art-ink)" strokeWidth="3" strokeLinecap="round"><path d="M137 25c100 45-15 85 86 130M223 25c-100 45 15 85-86 130" /><path d="M146 32h68M165 52h30M162 74h36M149 97h62M165 119h30M151 143h59" stroke="var(--art-medium)" /><circle cx="100" cy="90" r="24" fill="var(--art-paper)" stroke="var(--art-medium)" /><circle cx="100" cy="90" r="9" fill="var(--art-medium)" stroke="none" /><circle cx="272" cy="55" r="12" stroke="var(--art-medium)" /></g>}
    {type === 'chemistry' && <g stroke="var(--art-ink)" strokeWidth="2.5" strokeLinejoin="round"><path d="M157 32h47m-37 0v42l-43 66q-8 15 9 15h95q17 0 9-15l-43-66V32" fill="var(--art-paper)" /><path d="m147 110-18 29q-5 9 7 9h89q11 0 6-9l-18-29Z" fill="var(--art-medium)" stroke="none" /><circle cx="182" cy="114" r="6" fill="var(--art-wash)" stroke="none" /><circle cx="199" cy="132" r="4" fill="var(--art-wash)" stroke="none" /><circle cx="176" cy="87" r="4" /><circle cx="270" cy="61" r="16" /><path d="M67 117h33m-16-16v32" /></g>}
    {type === 'astronomy' && <><circle cx="180" cy="91" r="47" fill="var(--art-medium)" /><path d="M141 66c20-3 44 7 74 8m-79 26c30-11 56 14 87 10" stroke="var(--art-soft)" strokeWidth="6" /><ellipse cx="180" cy="91" rx="101" ry="23" transform="rotate(-23 180 91)" stroke="var(--art-ink)" strokeWidth="3" /><circle cx="271" cy="52" r="8" fill="var(--art-soft)" /><path d="M88 48v18m-9-9h18m169 69v16m-8-8h16" stroke="var(--art-medium)" strokeWidth="2" /></>}
    {type === 'earth' && <><circle cx="180" cy="90" r="62" fill="var(--art-medium)" /><path d="m140 39 22 17 4 24-22 6-8 21-15-13m59-60 18 24 25 2 15 23-27 14-7 36-19 13-13-35-28-12 10-23 24-3m41 53 24 9" fill="var(--art-soft)" /><ellipse cx="180" cy="90" rx="27" ry="62" stroke="var(--art-ink)" strokeWidth="1.5" /><path d="M118 90h124m-116-28h108m-108 56h108" stroke="var(--art-ink)" strokeWidth="1.5" /><path d="M80 59v19m-9-9h18m193 45v19m-9-9h18" stroke="var(--art-medium)" strokeWidth="2" /></>}
    {type === 'language' && <g><path d="M108 41h137v80H172l-28 23v-23h-36V41Z" fill="var(--art-paper)" stroke="var(--art-ink)" strokeWidth="2" /><text x="131" y="95" fill="var(--art-ink)" fontFamily="Georgia" fontSize="43">Aa</text><path d="M228 71h35v77h-59l-20 14v-41" stroke="var(--art-ink)" strokeWidth="2" /><path d="M68 58h18m-9-9v18m191 51h18m-9-9v18" stroke="var(--art-medium)" strokeWidth="2" /></g>}
    {type === 'history' && <g stroke="var(--art-ink)" strokeWidth="2"><path d="M113 47h140v95H113" fill="var(--art-paper)" /><path d="M111 40v111m-9-6h153m-113-77h83m-83 20h65m-65 20h78" /><circle cx="268" cy="53" r="20" fill="var(--art-soft)" /><path d="M268 40v13l9 6M88 84v27m-13-14h26" /></g>}
    {type === 'business' && <g stroke="var(--art-ink)" strokeWidth="2"><rect x="107" y="62" width="148" height="84" rx="9" fill="var(--art-paper)" /><path d="M160 62V42h43v20m-96 24h148" /><path d="M141 123v-16m39 16V97m40 26V88" strokeWidth="12" stroke="var(--art-medium)" strokeLinecap="round" /><circle cx="83" cy="46" r="12" fill="var(--art-soft)" /><path d="M278 98v20m-10-10h20" /></g>}
    {type === 'design' && <g stroke="var(--art-ink)" strokeWidth="2"><rect x="113" y="34" width="135" height="114" rx="9" fill="var(--art-paper)" /><circle cx="146" cy="65" r="14" fill="var(--art-medium)" /><rect x="174" y="54" width="49" height="25" rx="3" fill="var(--art-soft)" /><path d="M134 106h91m-91 19h62" strokeWidth="5" stroke="var(--art-medium)" /><path d="m82 85-10 47 34-35-24-12Z" fill="var(--art-medium)" /><path d="m77 106 13 7m183-59v20m-10-10h20" /></g>}
    {type === 'engineering' && <g stroke="var(--art-ink)" strokeWidth="2.5" strokeLinejoin="round"><path d="M83 139h196M105 132V77l73-44 73 44v55M105 77h146m-146 55 73-55 73 55m-73 0V33m-73 44 73 55 73-55" /><circle cx="105" cy="77" r="5" fill="var(--art-paper)" /><circle cx="178" cy="132" r="5" fill="var(--art-paper)" /><circle cx="251" cy="77" r="5" fill="var(--art-paper)" /><path d="M70 36v17m-8-8h17" /></g>}
    {type === 'health' && <><path d="M180 139s-69-37-69-78c0-35 46-43 69-10 23-33 69-25 69 10 0 41-69 78-69 78Z" fill="var(--art-medium)" stroke="var(--art-ink)" strokeWidth="2" /><path d="M123 90h29l12-21 16 45 14-30 10 6h31" stroke="var(--art-paper)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><path d="M83 39v20m-10-10h20m177 73v20m-10-10h20" stroke="var(--art-medium)" strokeWidth="2" /></>}
    {type === 'arts' && <g stroke="var(--art-ink)" strokeWidth="2"><path d="M144 129V46l82-17v83m-82-43 82-17" strokeWidth="4" /><ellipse cx="129" cy="131" rx="20" ry="13" fill="var(--art-medium)" transform="rotate(-16 129 131)" /><ellipse cx="211" cy="115" rx="20" ry="13" fill="var(--art-medium)" transform="rotate(-16 211 115)" /><path d="M77 63v21m-10-10h21m177 33v20m-10-10h20" /><circle cx="274" cy="56" r="7" fill="var(--art-soft)" /></g>}
    {type === 'numbers' && <>
      <g stroke="var(--art-ink)" strokeOpacity=".24"><path d="M0 36h360M0 72h360M0 108h360M0 144h360M36 0v180M72 0v180M108 0v180M144 0v180M180 0v180M216 0v180M252 0v180M288 0v180M324 0v180"/></g>
      <g transform="translate(144 34)"><path d="m0 28 50-27 50 27-50 29L0 28Z" fill="var(--art-medium)"/><path d="m0 28 50 29v60L0 88V28Z" fill="var(--art-soft)"/><path d="m50 57 50-29v60l-50 29V57Z" fill="var(--art-strong)"/><path d="m0 48 50 29 50-29M0 68l50 29 50-29M17 19l50 28v60M34 9l50 29v60M17 38v60M34 48v59" stroke="var(--art-paper)" strokeWidth="1.4"/></g>
      <g transform="translate(66 89) rotate(-13)"><rect width="65" height="43" rx="9" fill="var(--art-paper)"/><text x="14" y="29" fill="var(--art-ink)" fontFamily="Georgia" fontSize="26">√x</text></g>
      <text x="267" y="59" fill="var(--art-ink)" fontSize="24" fontFamily="Georgia">π</text><path d="M278 110v19m-9-10h19M95 37v12m-6-6h12" stroke="var(--art-medium)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="123" cy="147" r="4" fill="var(--art-medium)"/>
    </>}
    {type === 'computing' && <>
      <path d="M68 71h40m144 0h41v56h-35M87 117v25h49m128-109v21" stroke="var(--art-medium)" strokeWidth="2" strokeDasharray="4 4"/>
      <circle cx="66" cy="71" r="8" fill="var(--art-strong)"/><rect x="76" y="109" width="15" height="15" rx="4" fill="var(--art-medium)"/><circle cx="294" cy="127" r="7" fill="var(--art-medium)"/>
      <g transform="translate(108 35) rotate(-5 72 55)"><rect width="148" height="112" rx="11" fill="var(--art-paper)" stroke="var(--art-ink)" strokeWidth="1.5"/><path d="M1 25h146" stroke="var(--art-soft)"/><circle cx="14" cy="12" r="3" fill="var(--art-medium)"/><circle cx="25" cy="12" r="3" fill="var(--art-medium)"/><circle cx="36" cy="12" r="3" fill="var(--art-soft)"/><path d="m50 47-19 18 19 17m49-35 19 18-19 17m-17-40-12 46" stroke="var(--art-ink)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/></g>
      <rect x="269" y="39" width="22" height="22" rx="6" transform="rotate(15 269 39)" fill="var(--art-strong)"/><path d="m52 140 8 11 11-8" stroke="var(--art-ink)" strokeWidth="2"/><text x="281" y="161" fill="var(--art-ink)" fontSize="18" fontFamily="monospace">01</text>
    </>}
    {type === 'logic' && <>
      <circle cx="183" cy="90" r="71" stroke="var(--art-medium)" strokeDasharray="3 5" strokeOpacity=".45"/>
      <g transform="translate(132 37) rotate(-9 50 50)"><path d="M0 0h110L0 110V0Z" fill="var(--art-strong)"/><path d="M110 0v110H0L110 0Z" fill="var(--art-soft)"/><path d="m0 110 55-55 55 55H0Z" fill="var(--art-strong)"/><path d="m55 55 27-27 28 27-28 28-27-28Z" fill="var(--art-wash)"/><path d="M0 0h55v55L0 0Z" fill="var(--art-medium)"/></g>
      <g transform="translate(68 103) rotate(-13)"><rect width="39" height="39" rx="11" fill="var(--art-paper)"/><text x="13" y="28" fontFamily="Georgia" fontSize="26" fill="var(--art-ink)">?</text></g>
      <path d="m282 52 5 9 10 2-7 7 1 10-9-5-9 5 2-10-7-7 10-2 4-9Z" fill="var(--art-strong)"/><circle cx="274" cy="129" r="6" stroke="var(--art-medium)" strokeWidth="2"/><path d="M103 47v13m-6-6h13" stroke="var(--art-medium)" strokeWidth="2"/>
    </>}
    {type === 'physics' && <>
      <g transform="translate(180 90)" stroke="var(--art-ink)" strokeWidth="2"><ellipse rx="78" ry="28"/><ellipse rx="78" ry="28" transform="rotate(60)"/><ellipse rx="78" ry="28" transform="rotate(120)"/><circle r="15" fill="var(--art-strong)" stroke="none"/><circle cx="78" r="7" fill="var(--art-wash)"/><circle cx="-39" cy="-66" r="7" fill="var(--art-wash)"/><circle cx="-39" cy="66" r="7" fill="var(--art-wash)"/></g>
      <path d="M66 49v16m-8-8h16M281 125v16m-8-8h16" stroke="var(--art-medium)" strokeWidth="2"/><circle cx="293" cy="47" r="4" fill="var(--art-strong)"/>
    </>}
    {type === 'data' && <>
      <path d="M102 133h156M111 136V43" stroke="var(--art-ink)" strokeWidth="2"/><rect x="127" y="94" width="26" height="37" rx="4" fill="var(--art-soft)"/><rect x="168" y="71" width="26" height="60" rx="4" fill="var(--art-medium)"/><rect x="209" y="42" width="26" height="89" rx="4" fill="var(--art-strong)"/><path d="m133 69 47-27 46-23" stroke="var(--art-ink)" strokeWidth="2" strokeDasharray="4 5"/><circle cx="133" cy="69" r="5" fill="var(--art-paper)" stroke="var(--art-ink)"/><circle cx="180" cy="42" r="5" fill="var(--art-paper)" stroke="var(--art-ink)"/><circle cx="226" cy="19" r="5" fill="var(--art-paper)" stroke="var(--art-ink)"/><text x="278" y="115" fontSize="24" fill="var(--art-ink)" fontFamily="Georgia">%</text><circle cx="70" cy="84" r="7" fill="var(--art-soft)"/>
    </>}
    {type === 'geometry' && <>
      <circle cx="172" cy="90" r="60" stroke="var(--art-ink)" strokeWidth="2"/><path d="m111 137 61-107 62 107H111Z" fill="var(--art-medium)" fillOpacity=".7" stroke="var(--art-ink)" strokeWidth="2"/><rect x="146" y="64" width="105" height="83" rx="2" fill="var(--art-soft)" fillOpacity=".7" stroke="var(--art-ink)" strokeWidth="2"/><path d="M172 28v125m-72-63h144" stroke="var(--art-ink)" strokeDasharray="3 5"/><text x="73" y="64" fontFamily="Georgia" fontSize="22" fill="var(--art-ink)">θ</text><circle cx="280" cy="112" r="7" fill="var(--art-medium)"/>
    </>}
  </svg>;
}
