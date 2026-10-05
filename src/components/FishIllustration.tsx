// The fish drawing used across the app (made with SVG, so it stays sharp at any size).
export default function FishIllustration({ compact = false }: { compact?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={compact ? "fish-mark" : "fish-illustration"}
      viewBox="0 0 520 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M418 130c38-34 70-50 88-51-4 26-14 43-31 51 17 8 27 25 31 51-18-1-50-17-88-51Z"
        fill="#D9A441"
        stroke="#193E3B"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M66 131c50-66 134-86 225-65 58 13 104 42 137 64-33 23-79 51-137 65-91 21-175 1-225-64Z"
        fill="#E9E0C8"
        stroke="#193E3B"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <path
        d="M129 94c44 15 74 12 112 2M118 123c58 16 105 15 157 0M123 153c54-12 101-12 150 1M147 177c38-9 72-8 107 0"
        stroke="#78958A"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M254 73c26-26 61-42 92-42-11 26-26 43-45 54M264 190c25 27 56 39 87 39-11-24-27-40-49-51"
        fill="#A9B9A7"
        stroke="#193E3B"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M271 125c-4 25 8 47 34 58 5-25-6-44-34-58Z"
        fill="#D9A441"
        stroke="#193E3B"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M94 130c0 38-14 62-35 77M94 130c0-37-14-61-35-77"
        stroke="#193E3B"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <circle cx="122" cy="111" r="7" fill="#193E3B" />
      <circle cx="120" cy="109" r="2" fill="#F7F1E2" />
      <path
        d="M74 139c14 5 29 4 43-2M334 103c17 6 35 15 53 27-18 13-36 22-54 28"
        stroke="#193E3B"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
