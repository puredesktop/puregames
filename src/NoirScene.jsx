import React, { useId } from "react";

// Original vector sets: scenery, lighting and weather are drawn by the app.
export function NoirScene({ place = 0 }) {
  const id = useId().replace(/:/g, "");
  const sky = `${id}sky`,
    light = `${id}light`,
    fog = `${id}fog`,
    grain = `${id}grain`;
  return (
    <svg
      className="noir-scene"
      viewBox="0 0 900 650"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={
        [
          "Rain outside the Meridian Theatre, a lone figure under an amber marquee",
          "The Blue Hour diner, glowing windows beneath an elevated railway",
          "Vesper Pier, a lamp cutting through mist above the black river",
          "Bell Street Station, an illuminated clock above deserted platforms",
        ][place]
      }
    >
      <defs>
        <linearGradient id={sky} x2="0" y2="1">
          <stop stopColor="#172527" />
          <stop offset=".65" stopColor="#46504b" />
          <stop offset="1" stopColor="#b0a58c" />
        </linearGradient>
        <radialGradient id={light}>
          <stop stopColor="#f7dca0" stopOpacity=".45" />
          <stop offset="1" stopColor="#d6ba78" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={fog} x2="0" y2="1">
          <stop stopColor="#bdc0aa" stopOpacity="0" />
          <stop offset="1" stopColor="#bdc0aa" stopOpacity=".17" />
        </linearGradient>
        <filter id={grain}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".68"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope=".12" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" mode="soft-light" />
        </filter>
      </defs>
      <rect width="900" height="650" fill={`url(#${sky})`} />
      <circle cx="660" cy="110" r="54" fill="#c0c1a5" opacity=".15" />
      <g fill="#243336">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <g key={i}>
            <rect
              x={i * 100 - 20}
              y={150 + ((i * 37) % 120)}
              width={70 + (i % 3) * 15}
              height="400"
            />
            <path d={`M${i * 100 + 10} ${160 + ((i * 37) % 120)}v-30h25v30`} />
          </g>
        ))}
      </g>
      <g fill="#cfbf90" opacity=".23">
        {Array.from({ length: 65 }, (_, i) => (
          <rect
            key={i}
            x={30 + ((i * 137) % 850)}
            y={220 + ((i * 59) % 230)}
            width="5"
            height="11"
          />
        ))}
      </g>
      <path d="M0 490 450 410 900 500V650H0Z" fill="#111c20" />
      {place === 0 && (
        <>
          <path
            d="M75 158 525 112 665 208V488H75Z"
            fill="#182426"
            stroke="#697065"
            strokeWidth="2"
          />
          <path d="M82 164 522 126 522 414 82 472Z" fill="#34403c" />
          {[150, 245, 340, 435].map((x) => (
            <g key={x}>
              <path d={`M${x} 190v230h23V185Z`} fill="#182627" />
              <path d={`M${x + 5} 191v214`} stroke="#747a69" strokeWidth="2" />
            </g>
          ))}
          <rect x="450" y="190" width="117" height="69" fill="#d1b474" />
          <path
            d="M488 190v69m39-69v69M450 225h117"
            stroke="#29322e"
            strokeWidth="7"
          />
          <path
            d="M98 319 593 291 666 349 54 390Z"
            fill="#192627"
            stroke="#989076"
            strokeWidth="3"
          />
          <path d="M55 390 666 349 666 384 55 430Z" fill="#c2ab79" />
          <text
            x="327"
            y="390"
            textAnchor="middle"
            transform="rotate(-4 327 390)"
            fontFamily="Georgia,serif"
            fontSize="31"
            letterSpacing="9"
            fill="#283132"
          >
            MERIDIAN
          </text>
          <path d="M100 432 591 397V504L100 546Z" fill="#101d1f" />
          {[125, 229, 334, 438].map((x) => (
            <g key={x}>
              <rect x={x} y="432" width="75" height="88" fill="#7e7454" />
              <path
                d={`M${x + 7} 436v80m29-80v80m30-80v80`}
                stroke="#2c3430"
                strokeWidth="5"
              />
            </g>
          ))}
          <rect x="201" y="397" width="48" height="47" fill="#dcbd7a" />
          <path d="M225 399v44m-22-22h43" stroke="#383a2f" strokeWidth="4" />
          <path d="m65 548 565-39 210 141H0Z" fill="#a39368" opacity=".08" />
          <text
            x="561"
            y="164"
            fontFamily="monospace"
            fontSize="10"
            letterSpacing="4"
            fill="#a89f7f"
            transform="rotate(30 561 164)"
          >
            FINAL SHOW
          </text>
        </>
      )}
      {place === 1 && (
        <>
          <path d="M0 100 900 170V215L0 145Z" fill="#172427" />
          {[70, 360, 660].map((x) => (
            <path
              key={x}
              d={`M${x} 150v365h24V150M${x - 65} 160l80 80 70-65`}
              fill="#1a292b"
              stroke="#1a292b"
              strokeWidth="12"
            />
          ))}
          <path
            d="M155 285 725 265 835 330V498L155 526Z"
            fill="#1b2b2c"
            stroke="#8b8a70"
            strokeWidth="3"
          />
          <path d="M141 296 727 276 847 334H130Z" fill="#768172" />
          <rect
            x="181"
            y="349"
            width="530"
            height="110"
            rx="8"
            fill="#bcaa75"
          />
          {[181, 287, 393, 499, 605, 711].map((x) => (
            <path
              key={x}
              d={`M${x} 349v112`}
              stroke="#263633"
              strokeWidth="9"
            />
          ))}
          <g stroke="#514f3d" strokeWidth="4" opacity=".6">
            {Array.from({ length: 9 }, (_, i) => (
              <path key={i} d={`M182 ${355 + i * 11}h529`} />
            ))}
          </g>
          <path
            d="M190 438h510m-460 0v-25h70v25m100 0v-25h70v25m100 0v-25h70v25"
            stroke="#302f27"
            strokeWidth="9"
            fill="none"
          />
          <rect x="728" y="349" width="71" height="143" fill="#c8b887" />
          <path d="M734 360h58v90h-58Z" fill="#48524a" />
          <rect
            x="290"
            y="246"
            width="305"
            height="75"
            rx="8"
            fill="#182d31"
            stroke="#929e8e"
            strokeWidth="2"
          />
          <text
            x="442"
            y="279"
            textAnchor="middle"
            fontFamily="Georgia,serif"
            fontSize="25"
            letterSpacing="4"
            fill="#dfcca0"
          >
            THE BLUE HOUR
          </text>
          <text
            x="442"
            y="302"
            textAnchor="middle"
            fontFamily="monospace"
            fontSize="10"
            letterSpacing="7"
            fill="#879f95"
          >
            OPEN ALL NIGHT
          </text>
          <path d="M155 535 825 505 900 650H0Z" fill="#c8ae75" opacity=".09" />
        </>
      )}
      {place === 2 && (
        <>
          <path d="M0 412 900 405V650H0Z" fill="#1f3033" />
          {Array.from({ length: 22 }, (_, i) => (
            <path
              key={i}
              d={`M${(i * 97) % 850} ${420 + i * 10}h${35 + ((i * 31) % 180)}`}
              stroke="#8a9788"
              opacity=".24"
            />
          ))}
          <path
            d="M-80 642 260 400 665 412 900 650Z"
            fill="#28312e"
            stroke="#9b9a7d"
            strokeWidth="2"
          />
          {Array.from({ length: 10 }, (_, i) => (
            <path
              key={i}
              d={`M${i * 105 - 100} 650 440 400`}
              stroke="#141e20"
              strokeWidth="4"
            />
          ))}
          {[420, 444, 474, 512, 560, 620].map((y) => (
            <path
              key={y}
              d={`M${580 - y} ${y}H${y + 185}`}
              stroke="#5f6659"
              opacity=".6"
            />
          ))}
          {[230, 690].map((x) => (
            <g key={x}>
              <path d={`M${x} 245v280`} stroke="#141f21" strokeWidth="8" />
              <path d={`M${x - 25} 244h50l-7-38h-36Z`} fill="#dbc38a" />
              <circle cx={x} cy="230" r="115" fill={`url(#${light})`} />
            </g>
          ))}
          <path
            d="M585 291 725 268 813 311V426H585Z"
            fill="#273432"
            stroke="#777d6c"
            strokeWidth="2"
          />
          <path d="M571 292 726 251 828 310Z" fill="#152326" />
          <rect x="639" y="312" width="53" height="62" fill="#d0b47a" />
          <path d="M665 312v62m-26-30h53" stroke="#3e4539" strokeWidth="5" />
          <rect x="723" y="331" width="48" height="95" fill="#172526" />
          <text
            x="657"
            y="398"
            fontFamily="monospace"
            fontSize="9"
            letterSpacing="3"
            fill="#b2ad91"
          >
            VESPER / 09
          </text>
          <path d="M36 414 164 415 138 440H70Z" fill="#101e21" />
          <path d="M103 415V311l43 99Z" fill="#526257" opacity=".5" />
          <path d="M206 450v55m-18-45h36" stroke="#151e1e" strokeWidth="12" />
        </>
      )}
      {place === 3 && (
        <>
          <path
            d="M90 170h740v330H90Z"
            fill="#283835"
            stroke="#777e6a"
            strokeWidth="2"
          />
          <path
            d="M60 170 450 46 850 170Z"
            fill="#273634"
            stroke="#88907a"
            strokeWidth="3"
          />
          <path
            d="M150 492V300a300 210 0 0 1 600 0v192"
            fill="#121f22"
            stroke="#5c6c5d"
            strokeWidth="15"
          />
          {[200, 265, 630, 695].map((x) => (
            <path key={x} d={`M${x} 255v245h16V255Z`} fill="#566257" />
          ))}
          <circle
            cx="450"
            cy="195"
            r="47"
            fill="#c2b386"
            stroke="#27342f"
            strokeWidth="6"
          />
          {Array.from({ length: 12 }, (_, i) => (
            <path
              key={i}
              d="M450 155v8"
              stroke="#344235"
              strokeWidth="2"
              transform={`rotate(${i * 30} 450 195)`}
            />
          ))}
          <path
            d="M450 166v29l25 13"
            fill="none"
            stroke="#354135"
            strokeWidth="4"
          />
          <text
            x="450"
            y="280"
            textAnchor="middle"
            fontFamily="Georgia,serif"
            fontSize="24"
            letterSpacing="9"
            fill="#b4b290"
          >
            BELL STREET
          </text>
          <path
            d="M440 370 185 650m300-280 185 280M430 370 125 650m370-280 245 280"
            stroke="#859085"
            strokeWidth="4"
          />
          {Array.from({ length: 10 }, (_, i) => (
            <path
              key={i}
              d={`M${430 - i * i * 3} ${380 + i * 25}h${60 + i * i * 6}`}
              stroke="#414f49"
              strokeWidth="5"
            />
          ))}
          <rect x="630" y="330" width="141" height="130" fill="#46534a" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect
                x={637 + i * 43}
                y="338"
                width="36"
                height="111"
                fill="#2c3a35"
                stroke="#8a8e73"
              />
              <path d={`M${644 + i * 43} 355h22m-22 6h22`} stroke="#879079" />
            </g>
          ))}
          <path d="M308 320v190M554 320v190" stroke="#b4ae84" strokeWidth="3" />
          <ellipse cx="310" cy="325" rx="29" ry="8" fill="#ccbb85" />
          <ellipse cx="555" cy="325" rx="29" ry="8" fill="#ccbb85" />
        </>
      )}
      <rect width="900" height="650" fill={`url(#${fog})`} />
      <g
        className="noir-figure"
        fill="#111c1f"
        transform={
          place === 2
            ? "translate(510 415)"
            : place === 1
            ? "translate(110 450)"
            : "translate(590 470)"
        }
      >
        <ellipse cx="0" cy="101" rx="42" ry="9" opacity=".5" />
        <path d="M-18 10q18-8 36 0l13 61h-63Z" />
        <path d="m-16 68 3 35h10l5-35m7 0 4 35h10l-1-35" />
        <circle cy="-2" r="12" />
        <path d="M-24-9h48v5h-48m8-5 5-13h22l5 13Z" />
      </g>
      <g className="noir-rain" stroke="#d5d4ba" strokeWidth=".7" opacity=".18">
        {Array.from({ length: 100 }, (_, i) => (
          <path
            key={i}
            d={`m${(i * 173) % 940} ${((i * 97) % 730) - 70}-9 31`}
          />
        ))}
      </g>
      <rect
        width="900"
        height="650"
        fill="transparent"
        filter={`url(#${grain})`}
        opacity=".6"
        pointerEvents="none"
      />
      <path
        d="M0 0h900v650H0Z"
        fill="none"
        stroke="#0d181c"
        strokeWidth="35"
        opacity=".2"
      />
    </svg>
  );
}
export function NoirPreview() {
  return (
    <div className="noir-preview">
      <NoirScene />
      <div className="noir-preview-type">
        <span>A COOPERATIVE NOIR MYSTERY</span>
        <h2>
          The
          <br />
          Ninth Bell<span>.</span>
        </h2>
        <p>
          Everyone has a story.
          <br />
          Someone has the truth.
        </p>
      </div>
      <div className="noir-preview-bottom">
        <span>BLACKWATER / 01:17 AM</span>
        <span>CASE FILE № 09</span>
      </div>
    </div>
  );
}
