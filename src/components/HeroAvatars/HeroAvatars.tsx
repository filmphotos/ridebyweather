const SKIN = "#e8b89a";
const HAIR = "#2a1f17";
const KIT = "#1a1a1a";
const KIT_ACCENT = "#2d2d2d";
const BIKE = "#1a1a1a";
const BIKE_LIGHT = "#9ca3af";
const SHADOW = "rgba(0,0,0,0.08)";
const GROUND = "#d9c8a8";

interface AvatarProps {
  className?: string;
}

export function CyclistMale({ className }: AvatarProps) {
  return (
    <svg viewBox="0 0 220 220" className={className} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="110" cy="200" rx="90" ry="6" fill={SHADOW} />
      <rect x="0" y="196" width="220" height="2" fill={GROUND} opacity="0.4" />

      {/* Bike wheels */}
      <circle cx="55" cy="170" r="28" fill="none" stroke={BIKE} strokeWidth="3.5" />
      <circle cx="55" cy="170" r="4" fill={BIKE} />
      <circle cx="165" cy="170" r="28" fill="none" stroke={BIKE} strokeWidth="3.5" />
      <circle cx="165" cy="170" r="4" fill={BIKE} />
      {[0, 45, 90, 135].map((a) => {
        const r = (a * Math.PI) / 180;
        return (
          <g key={a} stroke={BIKE_LIGHT} strokeWidth="1.2">
            <line x1={55 + 27 * Math.cos(r)} y1={170 + 27 * Math.sin(r)} x2={55 - 27 * Math.cos(r)} y2={170 - 27 * Math.sin(r)} />
            <line x1={165 + 27 * Math.cos(r)} y1={170 + 27 * Math.sin(r)} x2={165 - 27 * Math.cos(r)} y2={170 - 27 * Math.sin(r)} />
          </g>
        );
      })}

      {/* Bike frame */}
      <line x1="55" y1="170" x2="110" y2="148" stroke={BIKE} strokeWidth="4" strokeLinecap="round" />
      <line x1="55" y1="170" x2="100" y2="105" stroke={BIKE} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="100" y1="105" x2="110" y2="148" stroke={BIKE} strokeWidth="4" strokeLinecap="round" />
      <line x1="100" y1="105" x2="153" y2="100" stroke={BIKE} strokeWidth="4" strokeLinecap="round" />
      <line x1="110" y1="148" x2="153" y2="100" stroke={BIKE} strokeWidth="4" strokeLinecap="round" />
      <line x1="153" y1="100" x2="165" y2="170" stroke={BIKE} strokeWidth="4" strokeLinecap="round" />
      <circle cx="110" cy="148" r="9" fill="none" stroke={BIKE_LIGHT} strokeWidth="2" />
      <path d="M153,100 Q158,100 161,106 Q161,114 163,116" fill="none" stroke={BIKE} strokeWidth="3" strokeLinecap="round" />
      <rect x="85" y="96" width="22" height="6" rx="3" fill={KIT_ACCENT} />

      {/* Far leg */}
      <path d="M101,103 Q108,128 105,142" fill="none" stroke={KIT} strokeWidth="9" strokeLinecap="round" opacity="0.55" />
      <path d="M105,142 Q113,160 118,170" fill="none" stroke={KIT} strokeWidth="7" strokeLinecap="round" opacity="0.55" />

      {/* Near leg power stroke */}
      <path d="M100,103 Q85,125 80,142" fill="none" stroke={KIT} strokeWidth="10" strokeLinecap="round" />
      <path d="M80,142 Q72,158 66,170" fill="none" stroke={KIT} strokeWidth="8" strokeLinecap="round" />
      <path d="M66,170 Q74,174 86,172" fill="none" stroke={KIT} strokeWidth="7" strokeLinecap="round" />

      {/* Torso leaning forward */}
      <path d="M100,103 Q108,86 152,76 Q160,76 161,90 Q146,102 100,108 Z" fill={KIT} />

      {/* Arms */}
      <path d="M155,80 Q160,90 163,100" fill="none" stroke={KIT} strokeWidth="9" strokeLinecap="round" />
      <path d="M163,100 Q165,106 165,112" fill="none" stroke={KIT} strokeWidth="7" strokeLinecap="round" />
      <circle cx="165" cy="113" r="4.5" fill={KIT} />

      {/* Neck */}
      <line x1="158" y1="72" x2="160" y2="80" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />

      {/* Head */}
      <circle cx="161" cy="60" r="13" fill={SKIN} />
      {/* Short hair */}
      <path d="M148,57 Q150,46 161,44 Q172,46 174,57 Q170,52 161,52 Q152,52 148,57 Z" fill={HAIR} />

      {/* Helmet */}
      <path d="M148,55 Q150,38 161,36 Q172,38 174,55 Q170,52 161,51 Q152,52 148,55 Z" fill={KIT} />
      <line x1="153" y1="42" x2="154" y2="50" stroke={KIT_ACCENT} strokeWidth="1.5" />
      <line x1="161" y1="40" x2="161" y2="48" stroke={KIT_ACCENT} strokeWidth="1.5" />
      <line x1="169" y1="42" x2="168" y2="50" stroke={KIT_ACCENT} strokeWidth="1.5" />

      {/* Sunglasses */}
      <ellipse cx="157" cy="62" rx="4.5" ry="3" fill="#0f172a" />
      <ellipse cx="166" cy="62" rx="4.5" ry="3" fill="#0f172a" />
      <line x1="161" y1="62" x2="161" y2="62" stroke={KIT_ACCENT} strokeWidth="1" />
    </svg>
  );
}

export function CyclistFemale({ className }: AvatarProps) {
  return (
    <svg viewBox="0 0 220 220" className={className} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="110" cy="200" rx="90" ry="6" fill={SHADOW} />
      <rect x="0" y="196" width="220" height="2" fill={GROUND} opacity="0.4" />

      <circle cx="55" cy="170" r="28" fill="none" stroke={BIKE} strokeWidth="3.5" />
      <circle cx="55" cy="170" r="4" fill={BIKE} />
      <circle cx="165" cy="170" r="28" fill="none" stroke={BIKE} strokeWidth="3.5" />
      <circle cx="165" cy="170" r="4" fill={BIKE} />
      {[0, 45, 90, 135].map((a) => {
        const r = (a * Math.PI) / 180;
        return (
          <g key={a} stroke={BIKE_LIGHT} strokeWidth="1.2">
            <line x1={55 + 27 * Math.cos(r)} y1={170 + 27 * Math.sin(r)} x2={55 - 27 * Math.cos(r)} y2={170 - 27 * Math.sin(r)} />
            <line x1={165 + 27 * Math.cos(r)} y1={170 + 27 * Math.sin(r)} x2={165 - 27 * Math.cos(r)} y2={170 - 27 * Math.sin(r)} />
          </g>
        );
      })}

      <line x1="55" y1="170" x2="110" y2="148" stroke={BIKE} strokeWidth="4" strokeLinecap="round" />
      <line x1="55" y1="170" x2="100" y2="105" stroke={BIKE} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="100" y1="105" x2="110" y2="148" stroke={BIKE} strokeWidth="4" strokeLinecap="round" />
      <line x1="100" y1="105" x2="153" y2="100" stroke={BIKE} strokeWidth="4" strokeLinecap="round" />
      <line x1="110" y1="148" x2="153" y2="100" stroke={BIKE} strokeWidth="4" strokeLinecap="round" />
      <line x1="153" y1="100" x2="165" y2="170" stroke={BIKE} strokeWidth="4" strokeLinecap="round" />
      <circle cx="110" cy="148" r="9" fill="none" stroke={BIKE_LIGHT} strokeWidth="2" />
      <path d="M153,100 Q158,100 161,106 Q161,114 163,116" fill="none" stroke={BIKE} strokeWidth="3" strokeLinecap="round" />
      <rect x="85" y="96" width="22" height="6" rx="3" fill={KIT_ACCENT} />

      <path d="M101,103 Q108,128 105,142" fill="none" stroke={KIT} strokeWidth="9" strokeLinecap="round" opacity="0.55" />
      <path d="M105,142 Q113,160 118,170" fill="none" stroke={KIT} strokeWidth="7" strokeLinecap="round" opacity="0.55" />

      <path d="M100,103 Q85,125 80,142" fill="none" stroke={KIT} strokeWidth="10" strokeLinecap="round" />
      <path d="M80,142 Q72,158 66,170" fill="none" stroke={KIT} strokeWidth="8" strokeLinecap="round" />
      <path d="M66,170 Q74,174 86,172" fill="none" stroke={KIT} strokeWidth="7" strokeLinecap="round" />

      <path d="M100,103 Q108,86 152,76 Q160,76 161,90 Q146,102 100,108 Z" fill={KIT} />

      <path d="M155,80 Q160,90 163,100" fill="none" stroke={KIT} strokeWidth="9" strokeLinecap="round" />
      <path d="M163,100 Q165,106 165,112" fill="none" stroke={KIT} strokeWidth="7" strokeLinecap="round" />
      <circle cx="165" cy="113" r="4.5" fill={KIT} />

      <line x1="158" y1="72" x2="160" y2="80" stroke={SKIN} strokeWidth="5" strokeLinecap="round" />

      <circle cx="161" cy="60" r="13" fill={SKIN} />

      {/* Ponytail */}
      <path d="M148,55 Q140,60 138,70 Q140,72 144,68 Q149,62 152,57 Z" fill={HAIR} />
      <ellipse cx="143" cy="68" rx="3.5" ry="2" fill={KIT_ACCENT} />

      {/* Hair on head under helmet */}
      <path d="M148,55 Q150,48 161,46 Q172,48 174,55 Q170,52 161,52 Q152,52 148,55 Z" fill={HAIR} />

      {/* Helmet */}
      <path d="M148,53 Q150,38 161,36 Q172,38 174,53 Q170,50 161,49 Q152,50 148,53 Z" fill={KIT} />
      <line x1="153" y1="42" x2="154" y2="48" stroke={KIT_ACCENT} strokeWidth="1.5" />
      <line x1="161" y1="40" x2="161" y2="46" stroke={KIT_ACCENT} strokeWidth="1.5" />
      <line x1="169" y1="42" x2="168" y2="48" stroke={KIT_ACCENT} strokeWidth="1.5" />

      <ellipse cx="157" cy="62" rx="4.5" ry="3" fill="#0f172a" />
      <ellipse cx="166" cy="62" rx="4.5" ry="3" fill="#0f172a" />
    </svg>
  );
}

export function RunnerMale({ className }: AvatarProps) {
  return (
    <svg viewBox="0 0 220 220" className={className} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="110" cy="200" rx="60" ry="5" fill={SHADOW} />
      <rect x="0" y="196" width="220" height="2" fill={GROUND} opacity="0.4" />

      {/* Back leg pushing off */}
      <path d="M105,130 Q80,150 65,162" fill="none" stroke={KIT} strokeWidth="11" strokeLinecap="round" opacity="0.55" />
      <path d="M65,162 Q60,175 55,188" fill="none" stroke={SKIN} strokeWidth="8" strokeLinecap="round" opacity="0.55" />
      <path d="M55,188 Q63,192 75,189" fill="none" stroke={KIT} strokeWidth="7" strokeLinecap="round" opacity="0.55" />

      {/* Front leg lifting */}
      <path d="M115,130 Q138,140 148,128" fill="none" stroke={KIT} strokeWidth="12" strokeLinecap="round" />
      <path d="M148,128 Q156,140 152,158" fill="none" stroke={SKIN} strokeWidth="9" strokeLinecap="round" />
      <path d="M152,158 Q160,162 168,160" fill="none" stroke={KIT} strokeWidth="8" strokeLinecap="round" />

      {/* Torso slightly leaning */}
      <path d="M95,80 Q92,110 108,132 Q128,135 130,128 Q132,100 124,76 Z" fill={KIT} />

      {/* Back arm swinging back */}
      <path d="M98,88 Q85,98 78,108" fill="none" stroke={KIT} strokeWidth="9" strokeLinecap="round" opacity="0.7" />
      <path d="M78,108 Q72,116 68,122" fill="none" stroke={SKIN} strokeWidth="7" strokeLinecap="round" opacity="0.7" />

      {/* Front arm forward */}
      <path d="M124,84 Q140,90 148,98" fill="none" stroke={KIT} strokeWidth="9" strokeLinecap="round" />
      <path d="M148,98 Q156,104 162,108" fill="none" stroke={SKIN} strokeWidth="7" strokeLinecap="round" />
      <circle cx="163" cy="109" r="4.5" fill={SKIN} />

      {/* Neck */}
      <line x1="110" y1="70" x2="110" y2="80" stroke={SKIN} strokeWidth="6" strokeLinecap="round" />

      {/* Head */}
      <circle cx="110" cy="58" r="14" fill={SKIN} />

      {/* Short hair */}
      <path d="M96,55 Q98,42 110,40 Q122,42 124,55 Q120,49 110,49 Q100,49 96,55 Z" fill={HAIR} />

      {/* Ear */}
      <ellipse cx="98" cy="60" rx="1.5" ry="2.5" fill={SKIN} stroke={HAIR} strokeWidth="0.5" />

      {/* Face details */}
      <circle cx="115" cy="58" r="1" fill={KIT_ACCENT} />
      <path d="M115,64 Q117,65 118,64" fill="none" stroke={KIT_ACCENT} strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

export function RunnerFemale({ className }: AvatarProps) {
  return (
    <svg viewBox="0 0 220 220" className={className} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="110" cy="200" rx="60" ry="5" fill={SHADOW} />
      <rect x="0" y="196" width="220" height="2" fill={GROUND} opacity="0.4" />

      <path d="M105,130 Q80,150 65,162" fill="none" stroke={KIT} strokeWidth="11" strokeLinecap="round" opacity="0.55" />
      <path d="M65,162 Q60,175 55,188" fill="none" stroke={SKIN} strokeWidth="8" strokeLinecap="round" opacity="0.55" />
      <path d="M55,188 Q63,192 75,189" fill="none" stroke={KIT} strokeWidth="7" strokeLinecap="round" opacity="0.55" />

      <path d="M115,130 Q138,140 148,128" fill="none" stroke={KIT} strokeWidth="12" strokeLinecap="round" />
      <path d="M148,128 Q156,140 152,158" fill="none" stroke={SKIN} strokeWidth="9" strokeLinecap="round" />
      <path d="M152,158 Q160,162 168,160" fill="none" stroke={KIT} strokeWidth="8" strokeLinecap="round" />

      {/* Tank top torso */}
      <path d="M95,82 Q92,110 108,132 Q128,135 130,128 Q132,102 124,82 Z" fill={KIT} />
      {/* Tank-top straps cut */}
      <path d="M99,82 Q102,80 105,82" fill={SKIN} />
      <path d="M115,82 Q118,80 121,82" fill={SKIN} />

      <path d="M98,90 Q85,100 78,110" fill="none" stroke={SKIN} strokeWidth="9" strokeLinecap="round" opacity="0.7" />
      <path d="M78,110 Q72,118 68,124" fill="none" stroke={SKIN} strokeWidth="7" strokeLinecap="round" opacity="0.7" />

      <path d="M124,86 Q140,92 148,100" fill="none" stroke={SKIN} strokeWidth="9" strokeLinecap="round" />
      <path d="M148,100 Q156,106 162,110" fill="none" stroke={SKIN} strokeWidth="7" strokeLinecap="round" />
      <circle cx="163" cy="111" r="4.5" fill={SKIN} />

      <line x1="110" y1="70" x2="110" y2="80" stroke={SKIN} strokeWidth="6" strokeLinecap="round" />

      <circle cx="110" cy="58" r="14" fill={SKIN} />

      {/* Hair top */}
      <path d="M96,55 Q98,40 110,38 Q122,40 124,55 Q120,49 110,49 Q100,49 96,55 Z" fill={HAIR} />

      {/* Ponytail swinging back */}
      <path d="M97,55 Q88,58 84,68 Q88,70 92,64 Q97,58 100,54 Z" fill={HAIR} />
      <ellipse cx="89" cy="66" rx="3.5" ry="2" fill={KIT_ACCENT} />

      {/* Face details */}
      <circle cx="115" cy="58" r="1" fill={KIT_ACCENT} />
      <path d="M115,64 Q117,65 118,64" fill="none" stroke={KIT_ACCENT} strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}
