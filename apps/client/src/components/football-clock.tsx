import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

interface FootballClockProps {
  size?: number;
  showSeconds?: boolean;
  className?: string;
}

export default function FootballClock({
  size = 160,
  showSeconds = true,
  className = "",
}: FootballClockProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);

    return () => clearInterval(interval);
  }, []);

  const hours = time.getHours(); // 24h format
  const hours12 = hours % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hourAngle = (hours12 + minutes / 60) * 30;
  const minuteAngle = (minutes + seconds / 60) * 6;
  const secondAngle = seconds * 6;

  const cx = 50;
  const cy = 50;

  const createPentagon = (pcx: number, pcy: number, r: number) => {
    const points = [];

    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2;

      points.push(`${pcx + r * Math.cos(angle)},${pcy + r * Math.sin(angle)}`);
    }

    return points.join(" ");
  };

  // Pentagon positions for realistic football pattern
  const pentagonPositions = [
    { x: 50, y: 50 }, // center
    { x: 50, y: 18 }, // top
    { x: 80, y: 33 }, // top-right
    { x: 70, y: 72 }, // bottom-right
    { x: 30, y: 72 }, // bottom-left
    { x: 20, y: 33 }, // top-left
  ];

  // Digital time - Localized
  const { i18n } = useTranslation();
  const timeStr = time.toLocaleTimeString(i18n.language || "fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: i18n.language?.startsWith("en") ? true : false,
  });

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <svg height={size} viewBox="0 0 100 100" width={size}>
        {/* Ball - white/cream base like a real football */}
        <defs>
          <radialGradient cx="40%" cy="35%" id="ballGradient" r="55%">
            <stop offset="0%" stopColor="#f5f5f0" />
            <stop offset="60%" stopColor="#e8e8e0" />
            <stop offset="100%" stopColor="#c8c8c0" />
          </radialGradient>
          <filter id="ballShadow">
            <feDropShadow dx="0" dy="2" floodOpacity="0.4" stdDeviation="3" />
          </filter>
        </defs>

        {/* Outer ball */}
        <circle
          cx={cx}
          cy={cy}
          fill="url(#ballGradient)"
          filter="url(#ballShadow)"
          r="48"
        />
        <circle
          cx={cx}
          cy={cy}
          fill="none"
          r="47"
          stroke="#d4d4d0"
          strokeWidth="1"
        />

        {/* Black pentagons - classic football pattern */}
        {pentagonPositions.map((pos, i) => (
          <polygon
            key={i}
            fill="#1a1a1a"
            opacity="0.85"
            points={createPentagon(pos.x, pos.y, i === 0 ? 10 : 7)}
            stroke="#111"
            strokeWidth="0.5"
          />
        ))}

        {/* White seam lines connecting pentagons */}
        {[1, 2, 3, 4, 5].map((i) => (
          <line
            key={`seam-${i}`}
            opacity="0.5"
            stroke="#bbb"
            strokeWidth="0.5"
            x1={
              pentagonPositions[0].x +
              10 * Math.cos((Math.PI * 2 * (i - 1)) / 5 - Math.PI / 2)
            }
            x2={
              pentagonPositions[i].x +
              7 * Math.cos((Math.PI * 2 * ((i + 1) % 5)) / 5 - Math.PI / 2)
            }
            y1={
              pentagonPositions[0].y +
              10 * Math.sin((Math.PI * 2 * (i - 1)) / 5 - Math.PI / 2)
            }
            y2={
              pentagonPositions[i].y +
              7 * Math.sin((Math.PI * 2 * ((i + 1) % 5)) / 5 - Math.PI / 2)
            }
          />
        ))}

        {/* Hour markers - white for visibility */}
        {[...Array(12)].map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180 - Math.PI / 2;
          const isMain = i % 3 === 0;
          const innerR = isMain ? 39 : 41;
          const outerR = 44;

          return (
            <line
              key={`marker-${i}`}
              stroke={isMain ? "#555" : "#999"}
              strokeLinecap="round"
              strokeWidth={isMain ? 1.8 : 0.8}
              x1={cx + innerR * Math.cos(angle)}
              x2={cx + outerR * Math.cos(angle)}
              y1={cy + innerR * Math.sin(angle)}
              y2={cy + outerR * Math.sin(angle)}
            />
          );
        })}

        {/* Hour hand - High contrast (Black outline + White fill) */}
        <line
          opacity="0.8"
          stroke="#000"
          strokeLinecap="round"
          strokeWidth="4"
          x1={cx}
          x2={cx + 22 * Math.cos(((hourAngle - 90) * Math.PI) / 180)}
          y1={cy}
          y2={cy + 22 * Math.sin(((hourAngle - 90) * Math.PI) / 180)}
        />
        <line
          stroke="#fff"
          strokeLinecap="round"
          strokeWidth="2"
          x1={cx}
          x2={cx + 22 * Math.cos(((hourAngle - 90) * Math.PI) / 180)}
          y1={cy}
          y2={cy + 22 * Math.sin(((hourAngle - 90) * Math.PI) / 180)}
        />

        {/* Minute hand - High contrast */}
        <line
          opacity="0.8"
          stroke="#000"
          strokeLinecap="round"
          strokeWidth="3"
          x1={cx}
          x2={cx + 32 * Math.cos(((minuteAngle - 90) * Math.PI) / 180)}
          y1={cy}
          y2={cy + 32 * Math.sin(((minuteAngle - 90) * Math.PI) / 180)}
        />
        <line
          stroke="#fff"
          strokeLinecap="round"
          strokeWidth="1.5"
          x1={cx}
          x2={cx + 32 * Math.cos(((minuteAngle - 90) * Math.PI) / 180)}
          y1={cy}
          y2={cy + 32 * Math.sin(((minuteAngle - 90) * Math.PI) / 180)}
        />

        {/* Second hand */}
        {showSeconds && (
          <line
            stroke="#e53e3e"
            strokeLinecap="round"
            strokeWidth="0.8"
            x1={cx}
            x2={cx + 36 * Math.cos(((secondAngle - 90) * Math.PI) / 180)}
            y1={cy}
            y2={cy + 36 * Math.sin(((secondAngle - 90) * Math.PI) / 180)}
          />
        )}

        {/* Center dot */}
        <circle cx={cx} cy={cy} fill="#e53e3e" r="3" />
        <circle cx={cx} cy={cy} fill="#fff" r="1.5" />
      </svg>

      {/* Digital time below the ball - 24h */}
      <div
        className="font-mono font-extrabold tracking-wider text-center mt-1"
        style={{
          fontSize: size * 0.13,
          color: "#e8e8e0",
        }}
      >
        {timeStr}
      </div>
    </div>
  );
}
