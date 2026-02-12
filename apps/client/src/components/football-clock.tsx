import { useEffect, useState } from 'react';

interface FootballClockProps {
    size?: number;
    showSeconds?: boolean;
    className?: string;
}

export default function FootballClock({ size = 160, showSeconds = true, className = '' }: FootballClockProps) {
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
        return points.join(' ');
    };

    // Pentagon positions for realistic football pattern
    const pentagonPositions = [
        { x: 50, y: 50 },  // center
        { x: 50, y: 18 },  // top
        { x: 80, y: 33 },  // top-right
        { x: 70, y: 72 },  // bottom-right
        { x: 30, y: 72 },  // bottom-left
        { x: 20, y: 33 },  // top-left
    ];

    // 24h digital time
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    return (
        <div className={`inline-flex flex-col items-center ${className}`}>
            <svg viewBox="0 0 100 100" width={size} height={size}>
                {/* Ball - white/cream base like a real football */}
                <defs>
                    <radialGradient id="ballGradient" cx="40%" cy="35%" r="55%">
                        <stop offset="0%" stopColor="#f5f5f0" />
                        <stop offset="60%" stopColor="#e8e8e0" />
                        <stop offset="100%" stopColor="#c8c8c0" />
                    </radialGradient>
                    <filter id="ballShadow">
                        <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.4" />
                    </filter>
                </defs>

                {/* Outer ball */}
                <circle cx={cx} cy={cy} r="48" fill="url(#ballGradient)" filter="url(#ballShadow)" />
                <circle cx={cx} cy={cy} r="47" fill="none" stroke="#d4d4d0" strokeWidth="1" />

                {/* Black pentagons - classic football pattern */}
                {pentagonPositions.map((pos, i) => (
                    <polygon
                        key={i}
                        points={createPentagon(pos.x, pos.y, i === 0 ? 10 : 7)}
                        fill="#1a1a1a"
                        stroke="#111"
                        strokeWidth="0.5"
                        opacity="0.85"
                    />
                ))}

                {/* White seam lines connecting pentagons */}
                {[1, 2, 3, 4, 5].map((i) => (
                    <line
                        key={`seam-${i}`}
                        x1={pentagonPositions[0].x + 10 * Math.cos((Math.PI * 2 * (i - 1)) / 5 - Math.PI / 2)}
                        y1={pentagonPositions[0].y + 10 * Math.sin((Math.PI * 2 * (i - 1)) / 5 - Math.PI / 2)}
                        x2={pentagonPositions[i].x + 7 * Math.cos((Math.PI * 2 * ((i + 1) % 5)) / 5 - Math.PI / 2)}
                        y2={pentagonPositions[i].y + 7 * Math.sin((Math.PI * 2 * ((i + 1) % 5)) / 5 - Math.PI / 2)}
                        stroke="#bbb"
                        strokeWidth="0.5"
                        opacity="0.5"
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
                            x1={cx + innerR * Math.cos(angle)}
                            y1={cy + innerR * Math.sin(angle)}
                            x2={cx + outerR * Math.cos(angle)}
                            y2={cy + outerR * Math.sin(angle)}
                            stroke={isMain ? '#555' : '#999'}
                            strokeWidth={isMain ? 1.8 : 0.8}
                            strokeLinecap="round"
                        />
                    );
                })}

                {/* Hour hand - High contrast (Black outline + White fill) */}
                <line
                    x1={cx}
                    y1={cy}
                    x2={cx + 22 * Math.cos((hourAngle - 90) * Math.PI / 180)}
                    y2={cy + 22 * Math.sin((hourAngle - 90) * Math.PI / 180)}
                    stroke="#000"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.8"
                />
                <line
                    x1={cx}
                    y1={cy}
                    x2={cx + 22 * Math.cos((hourAngle - 90) * Math.PI / 180)}
                    y2={cy + 22 * Math.sin((hourAngle - 90) * Math.PI / 180)}
                    stroke="#fff"
                    strokeWidth="2"
                    strokeLinecap="round"
                />

                {/* Minute hand - High contrast */}
                <line
                    x1={cx}
                    y1={cy}
                    x2={cx + 32 * Math.cos((minuteAngle - 90) * Math.PI / 180)}
                    y2={cy + 32 * Math.sin((minuteAngle - 90) * Math.PI / 180)}
                    stroke="#000"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.8"
                />
                <line
                    x1={cx}
                    y1={cy}
                    x2={cx + 32 * Math.cos((minuteAngle - 90) * Math.PI / 180)}
                    y2={cy + 32 * Math.sin((minuteAngle - 90) * Math.PI / 180)}
                    stroke="#fff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                />

                {/* Second hand */}
                {showSeconds && (
                    <line
                        x1={cx}
                        y1={cy}
                        x2={cx + 36 * Math.cos((secondAngle - 90) * Math.PI / 180)}
                        y2={cy + 36 * Math.sin((secondAngle - 90) * Math.PI / 180)}
                        stroke="#e53e3e"
                        strokeWidth="0.8"
                        strokeLinecap="round"
                    />
                )}

                {/* Center dot */}
                <circle cx={cx} cy={cy} r="3" fill="#e53e3e" />
                <circle cx={cx} cy={cy} r="1.5" fill="#fff" />
            </svg>

            {/* Digital time below the ball - 24h */}
            <div
                className="font-mono font-extrabold tracking-wider text-center mt-1"
                style={{
                    fontSize: size * 0.13,
                    color: '#e8e8e0',
                }}
            >
                {timeStr}
            </div>
        </div>
    );
}
