import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import {
  Layout,
  UploadCloud,
  Activity,
  Clock,
  Map as MapIcon,
  Mountain,
  ArrowUpRight,
  ArrowDownRight,
  FileCode,
  X,
  Zap,
  Check,
  Navigation,
  ArrowDown,
  ArrowUp,
  Timer,
  TrendingUp,
  ArrowLeft,
  Gauge,
  Settings,
  Layers,
  Sliders,
  Move3d,
  Rotate3d,
  Box,
  Cpu,
  Crosshair,
  Scissors,
  Save,
  MousePointerClick,
  GripVertical,
  Filter,
  ArrowUpDown,
  Play,
  Pause,
  FastForward,
  Monitor,
  Video,
  Eye,
  EyeOff,
  Download,
  Move,
  Maximize,
  Grid,
  Wand2,
} from "lucide-react";

// --- ATOMS (Zgodne z UiStyle.jsx) ---

const Button = ({
  as: Component = "button",
  children,
  variant = "primary",
  size = "sm",
  icon: Icon,
  className = "",
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center rounded-xl font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-gradient-to-r from-orange-300 to-rose-400 hover:from-orange-200 hover:to-rose-300 text-zinc-900 shadow-lg shadow-rose-500/20 border-0",
    secondary:
      "bg-zinc-800/50 text-zinc-200 border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600 shadow-sm backdrop-blur-sm",
    ghost: "text-zinc-400 hover:bg-zinc-800/50 hover:text-rose-300",
    danger:
      "bg-rose-950/30 text-rose-300 border border-rose-900/30 hover:bg-rose-900/40",
  };

  const sizes = {
    xs: "px-2.5 py-1 text-xs",
    sm: "px-4 py-1.5 text-sm",
    md: "px-6 py-2.5 text-sm",
    lg: "px-8 py-3 text-base",
  };

  return (
    <Component
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {Icon && (
        <Icon
          size={size === "md" ? 18 : 16}
          className={variant === "primary" ? "text-zinc-900/80 mr-2" : "mr-2"}
        />
      )}
      {children}
    </Component>
  );
};

const Card = ({ title, action, children, className = "" }) => (
  <div
    className={`bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/60 shadow-xl shadow-black/20 ${className}`}
  >
    {title && (
      <div className="px-5 py-4 border-b border-zinc-800/60 flex justify-between items-center">
        <h3 className="text-sm font-bold text-zinc-200">{title}</h3>
        {action}
      </div>
    )}
    <div className="p-5 relative h-full">{children}</div>
  </div>
);

const Badge = ({ children, variant = "neutral", className = "", ...props }) => {
  const base =
    "inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border backdrop-blur-sm transition-all";
  const variants = {
    neutral: "bg-zinc-800/50 border-zinc-700/50 text-zinc-400",
    success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
    warning: "bg-amber-400/10 border-amber-400/20 text-amber-200",
    primary: "bg-rose-500/10 border-rose-500/20 text-rose-300",
    active:
      "bg-rose-500 text-white border-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.4)]",
    info: "bg-sky-500/10 border-sky-500/20 text-sky-300",
  };
  return (
    <span className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </span>
  );
};

// --- LOGIKA BIZNESOWA ---

const calculateDistanceHaversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

const formatDuration = (ms) => {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));

  const pad = (n) => n.toString().padStart(2, "0");
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
};

const parseGPXRaw = (xmlString) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");
  const trkpts = xmlDoc.getElementsByTagName("trkpt");

  const rawPoints = [];
  for (let i = 0; i < trkpts.length; i++) {
    const lat = parseFloat(trkpts[i].getAttribute("lat"));
    const lon = parseFloat(trkpts[i].getAttribute("lon"));
    const eleEl = trkpts[i].getElementsByTagName("ele")[0];
    const timeEl = trkpts[i].getElementsByTagName("time")[0];

    const ele = eleEl ? parseFloat(eleEl.textContent) : 0;
    const time = timeEl ? new Date(timeEl.textContent) : null;

    rawPoints.push({ lat, lon, ele, time });
  }
  return rawPoints;
};

const analyzeTrack = (rawPoints, settings) => {
  if (!rawPoints || rawPoints.length === 0) return null;

  const points = [];
  let totalDistance = 0;
  let maxEle = -Infinity;
  let minEle = Infinity;
  let maxSpeed = 0;

  for (let i = 0; i < rawPoints.length; i++) {
    const p = rawPoints[i];

    if (p.ele > maxEle) maxEle = p.ele;
    if (p.ele < minEle) minEle = p.ele;

    let distFromLast = 0;
    let speed = 0;

    if (i > 0) {
      const prev = rawPoints[i - 1];
      const dist2D = calculateDistanceHaversine(
        prev.lat,
        prev.lon,
        p.lat,
        p.lon,
      );

      if (settings.mode3D) {
        const eleDiff = p.ele - prev.ele;
        distFromLast = Math.sqrt(dist2D * dist2D + eleDiff * eleDiff);
      } else {
        distFromLast = dist2D;
      }

      totalDistance += distFromLast;

      const timeDiff = (p.time - prev.time) / 1000;
      if (timeDiff > 0) {
        speed = (distFromLast / timeDiff) * 3.6;
      }
    }

    points.push({ ...p, cumDist: totalDistance, speed });
  }

  // Wygładzanie prędkości
  const windowSize = settings.smoothingWindow || 0;

  if (windowSize > 0) {
    for (let i = 0; i < points.length; i++) {
      let sum = 0;
      let count = 0;
      for (let j = i - windowSize; j <= i + windowSize; j++) {
        if (j >= 0 && j < points.length) {
          sum += points[j].speed;
          count++;
        }
      }
      points[i].smoothSpeed = sum / count;
      if (points[i].smoothSpeed > maxSpeed) maxSpeed = points[i].smoothSpeed;
    }
  } else {
    for (let i = 0; i < points.length; i++) {
      points[i].smoothSpeed = points[i].speed;
      if (points[i].speed > maxSpeed) maxSpeed = points[i].speed;
    }
  }

  // Segmenty
  const THRESHOLD = 15;
  const segments = [];
  let state = "IDLE";
  let segmentStartIdx = 0;
  let extremeEle = points[0].ele;
  let extremeIdx = 0;

  for (let i = 1; i < points.length; i++) {
    const p = points[i];

    if (state === "IDLE") {
      if (p.ele < points[segmentStartIdx].ele - THRESHOLD) {
        state = "DESCENDING";
        extremeEle = p.ele;
        extremeIdx = i;
      } else if (p.ele > points[segmentStartIdx].ele + THRESHOLD) {
        state = "ASCENDING";
        extremeEle = p.ele;
        extremeIdx = i;
      }
    } else if (state === "DESCENDING") {
      if (p.ele < extremeEle) {
        extremeEle = p.ele;
        extremeIdx = i;
      }
      if (p.ele > extremeEle + THRESHOLD) {
        segments.push(
          createSegment(points, segmentStartIdx, extremeIdx, "descent"),
        );
        state = "ASCENDING";
        segmentStartIdx = extremeIdx;
        extremeEle = p.ele;
        extremeIdx = i;
      }
    } else if (state === "ASCENDING") {
      if (p.ele > extremeEle) {
        extremeEle = p.ele;
        extremeIdx = i;
      }
      if (p.ele < extremeEle - THRESHOLD) {
        segments.push(
          createSegment(points, segmentStartIdx, extremeIdx, "ascent"),
        );
        state = "DESCENDING";
        segmentStartIdx = extremeIdx;
        extremeEle = p.ele;
        extremeIdx = i;
      }
    }
  }

  if (state !== "IDLE" && segmentStartIdx < points.length - 1) {
    segments.push(
      createSegment(
        points,
        segmentStartIdx,
        points.length - 1,
        state === "DESCENDING" ? "descent" : "ascent",
      ),
    );
  }

  // Numerowanie segmentów
  let descentCounter = 0;
  let ascentCounter = 0;

  segments.forEach((seg) => {
    if (seg.type === "descent") {
      descentCounter++;
      seg.typeIndex = descentCounter;
    } else {
      ascentCounter++;
      seg.typeIndex = ascentCounter;
    }
    seg.globalId = `${seg.type}-${seg.typeIndex}`;
  });

  const runsCount = descentCounter;
  const liftsCount = ascentCounter;

  const startTime = points[0]?.time;
  const endTime = points[points.length - 1]?.time;
  const durationMs = startTime && endTime ? endTime - startTime : 0;

  const durationHours = durationMs / 1000 / 3600;
  const avgSpeed = durationHours > 0 ? totalDistance / 1000 / durationHours : 0;

  return {
    points,
    segments,
    summary: {
      totalDistance: (totalDistance / 1000).toFixed(2),
      maxEle: Math.round(maxEle),
      minEle: Math.round(minEle),
      elevationGain: Math.round(maxEle - minEle),
      duration: formatDuration(durationMs),
      avgSpeed: avgSpeed.toFixed(1),
      maxSpeed: maxSpeed.toFixed(1),
      pointsCount: points.length,
      runsCount,
      liftsCount,
    },
  };
};

const createSegment = (allPoints, startIdx, endIdx, type) => {
  const segmentPoints = allPoints.slice(startIdx, endIdx + 1);
  const startP = allPoints[startIdx];
  const endP = allPoints[endIdx];

  const dist =
    segmentPoints[segmentPoints.length - 1].cumDist - segmentPoints[0].cumDist;
  const vert = Math.abs(endP.ele - startP.ele);
  const timeMs = endP.time - startP.time;

  let maxSegSpeed = 0;
  segmentPoints.forEach((p) => {
    if (p.smoothSpeed > maxSegSpeed) maxSegSpeed = p.smoothSpeed;
  });

  return {
    type,
    startIdx,
    endIdx,
    startTime: startP.time,
    endTime: endP.time,
    duration: formatDuration(timeMs),
    durationVal: timeMs,
    distance: (dist / 1000).toFixed(2),
    distanceVal: dist / 1000,
    vertical: Math.round(vert),
    maxSpeed: maxSegSpeed.toFixed(1),
    maxSpeedVal: maxSegSpeed,
    avgSpeed:
      timeMs > 0 ? (dist / 1000 / (timeMs / 1000 / 3600)).toFixed(1) : 0,
  };
};

// --- KOMPONENTY WIZUALIZACJI ---

const ElevationChart = ({
  points,
  height = 48,
  showLabels = true,
  hoverIndex,
  onHover,
  trimRange,
  onTrimChange,
}) => {
  if (!points || points.length === 0) return null;

  const containerRef = useRef(null);
  const isDragging = useRef(null);

  const sampleRate = Math.max(1, Math.ceil(points.length / 500));
  const data = points.filter((_, i) => i % sampleRate === 0);
  const width = 100;
  const h = 40;
  const minEle = Math.min(...data.map((p) => p.ele));
  const maxEle = Math.max(...data.map((p) => p.ele));
  const startDist = data[0].cumDist;
  const totalDist = data[data.length - 1].cumDist - startDist;
  const eleRange = maxEle - minEle || 1;

  const svgPoints = data
    .map((p) => {
      const x = ((p.cumDist - startDist) / totalDist) * width;
      const y = h - ((p.ele - minEle) / eleRange) * h;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPath = svgPoints ? `M ${svgPoints} L ${width},${h} L 0,${h} Z` : "";

  const getIndexFromX = (clientX) => {
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const targetDist = startDist + ratio * totalDist;

    let bestIdx = 0;
    let minDiff = Infinity;
    const step = Math.ceil(points.length / 500) || 1;

    for (let i = 0; i < points.length; i += step) {
      const diff = Math.abs(points[i].cumDist - targetDist);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = i;
      }
    }
    const startSearch = Math.max(0, bestIdx - step);
    const endSearch = Math.min(points.length - 1, bestIdx + step);
    for (let i = startSearch; i <= endSearch; i++) {
      const diff = Math.abs(points[i].cumDist - targetDist);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = i;
      }
    }
    return bestIdx;
  };

  const handleMouseDown = (e, type) => {
    if (!trimRange) return;
    e.stopPropagation();
    isDragging.current = type;
  };

  const handleMouseMove = (e) => {
    if (isDragging.current && onTrimChange) {
      const newIdx = getIndexFromX(e.clientX);
      onHover(newIdx);

      if (isDragging.current === "start") {
        const safeIdx = Math.min(newIdx, trimRange[1] - 1);
        onTrimChange([safeIdx, trimRange[1]]);
      } else {
        const safeIdx = Math.max(newIdx, trimRange[0] + 1);
        onTrimChange([trimRange[0], safeIdx]);
      }
      return;
    }

    if (onHover) {
      onHover(getIndexFromX(e.clientX));
    }
  };

  const handleMouseUp = () => {
    isDragging.current = null;
  };

  let trimLeftX = 0;
  let trimRightX = 100;
  if (trimRange && trimRange[0] !== null && trimRange[1] !== null) {
    const p1 = points[trimRange[0]];
    trimLeftX = ((p1.cumDist - startDist) / totalDist) * width;

    const p2 = points[trimRange[1]];
    trimRightX = ((p2.cumDist - startDist) / totalDist) * width;
  }

  let cursorX = -1;
  if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < points.length) {
    const p = points[hoverIndex];
    cursorX = ((p.cumDist - startDist) / totalDist) * width;
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-${height} relative group cursor-crosshair select-none`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (!isDragging.current) onHover && onHover(null);
        handleMouseUp();
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${h}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="eleGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb7185" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#fdba74" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <path
          d={areaPath}
          fill="url(#eleGradient)"
          className="transition-all duration-500"
        />
        <polyline
          points={svgPoints}
          fill="none"
          stroke="#fb7185"
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {cursorX >= 0 && cursorX <= width && (
          <line
            x1={cursorX}
            y1="0"
            x2={cursorX}
            y2={h}
            stroke="white"
            strokeWidth="0.5"
            strokeDasharray="1,1"
          />
        )}
      </svg>

      {trimRange && (
        <>
          <div
            className="absolute top-0 bottom-0 left-0 bg-black/60 backdrop-blur-[1px] pointer-events-none border-r border-rose-500/50"
            style={{ width: `${trimLeftX}%` }}
          ></div>
          <div
            className="absolute top-0 bottom-0 right-0 bg-black/60 backdrop-blur-[1px] pointer-events-none border-l border-rose-500/50"
            style={{ width: `${100 - trimRightX}%` }}
          ></div>

          <div
            className="absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize z-20 flex flex-col items-center justify-end group/handle"
            style={{ left: `${trimLeftX}%` }}
            onMouseDown={(e) => handleMouseDown(e, "start")}
          >
            <div className="h-full w-[1px] bg-rose-400 group-hover/handle:bg-rose-200 transition-colors"></div>
            <div className="w-4 h-6 bg-rose-500 rounded-t-lg flex items-center justify-center shadow-lg shadow-rose-500/50">
              <GripVertical size={12} className="text-white" />
            </div>
          </div>

          <div
            className="absolute top-0 bottom-0 w-4 -ml-2 cursor-ew-resize z-20 flex flex-col items-center justify-end group/handle"
            style={{ left: `${trimRightX}%` }}
            onMouseDown={(e) => handleMouseDown(e, "end")}
          >
            <div className="h-full w-[1px] bg-rose-400 group-hover/handle:bg-rose-200 transition-colors"></div>
            <div className="w-4 h-6 bg-rose-500 rounded-t-lg flex items-center justify-center shadow-lg shadow-rose-500/50">
              <GripVertical size={12} className="text-white" />
            </div>
          </div>
        </>
      )}

      {showLabels && (
        <>
          <div className="absolute top-0 right-0 text-[10px] text-zinc-500 bg-zinc-900/80 px-1 rounded">
            {maxEle}m
          </div>
          <div className="absolute bottom-0 right-0 text-[10px] text-zinc-500 bg-zinc-900/80 px-1 rounded">
            {minEle}m
          </div>
        </>
      )}
    </div>
  );
};

const SpeedChart = ({
  points,
  height = 48,
  hoverIndex,
  onHover,
  trimRange,
  settings,
  onSettingsChange,
}) => {
  if (!points || points.length === 0) return null;
  const sampleRate = Math.max(1, Math.ceil(points.length / 500));
  const data = points.filter((_, i) => i % sampleRate === 0);
  const width = 100;
  const h = 40;
  const maxSpeed = Math.max(...data.map((p) => p.smoothSpeed || 0));
  const startDist = data[0].cumDist;
  const totalDist = data[data.length - 1].cumDist - startDist;

  const svgPoints = data
    .map((p) => {
      const x = ((p.cumDist - startDist) / totalDist) * width;
      const y = h - ((p.smoothSpeed || 0) / (maxSpeed || 1)) * h;
      return `${x},${y}`;
    })
    .join(" ");

  const areaPath = svgPoints ? `M ${svgPoints} L ${width},${h} L 0,${h} Z` : "";

  let cursorX = -1;
  if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < points.length) {
    const p = points[hoverIndex];
    cursorX = ((p.cumDist - startDist) / totalDist) * width;
  }

  let trimLeftX = 0;
  let trimRightX = 100;
  if (trimRange) {
    if (trimRange[0] !== null) {
      const p = points[trimRange[0]];
      trimLeftX = ((p.cumDist - startDist) / totalDist) * width;
    }
    if (trimRange[1] !== null) {
      const p = points[trimRange[1]];
      trimRightX = ((p.cumDist - startDist) / totalDist) * width;
    }
  }

  const handleMouseMove = (e) => {
    if (!onHover) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    const targetDist = startDist + ratio * totalDist;

    let bestIdx = 0;
    let minDiff = Infinity;
    const step = Math.ceil(points.length / 500) || 1;

    for (let i = 0; i < points.length; i += step) {
      const diff = Math.abs(points[i].cumDist - targetDist);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = i;
      }
    }
    const startSearch = Math.max(0, bestIdx - step);
    const endSearch = Math.min(points.length - 1, bestIdx + step);
    for (let i = startSearch; i <= endSearch; i++) {
      const diff = Math.abs(points[i].cumDist - targetDist);
      if (diff < minDiff) {
        minDiff = diff;
        bestIdx = i;
      }
    }
    onHover(bestIdx);
  };

  return (
    <div className="relative">
      <div
        className={`w-full h-${height} relative group cursor-crosshair`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => onHover && onHover(null)}
      >
        <svg
          viewBox={`0 0 ${width} ${h}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="speedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path
            d={areaPath}
            fill="url(#speedGradient)"
            className="transition-all duration-500"
          />
          <polyline
            points={svgPoints}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {trimRange && (
            <>
              {trimLeftX > 0 && (
                <rect
                  x="0"
                  y="0"
                  width={trimLeftX}
                  height={h}
                  fill="rgba(0,0,0,0.5)"
                />
              )}
              {trimRightX < 100 && (
                <rect
                  x={trimRightX}
                  y="0"
                  width={100 - trimRightX}
                  height={h}
                  fill="rgba(0,0,0,0.5)"
                />
              )}
            </>
          )}

          {cursorX >= 0 && cursorX <= width && (
            <line
              x1={cursorX}
              y1="0"
              x2={cursorX}
              y2={h}
              stroke="white"
              strokeWidth="0.5"
              strokeDasharray="1,1"
            />
          )}
        </svg>
        <div className="absolute top-0 right-0 text-[10px] text-zinc-500 bg-zinc-900/80 px-1 rounded">
          {maxSpeed.toFixed(1)} km/h
        </div>
      </div>
    </div>
  );
};

// --- LOGIKA 3D ---
const project3D = (x, y, z, cosA, sinA, cosB, sinB) => {
  const ELEVATION_SCALE = 0.4;
  const x1 = x * cosA - z * sinA;
  const z1 = x * sinA + z * cosA;
  const y1 = y * ELEVATION_SCALE;

  const sx = 50 + x1 * 80;
  const sy = 50 - (y1 * cosB - z1 * sinB) * 80;
  return { sx, sy };
};

const RoutePreview = ({
  points,
  mode3D,
  detailLevel = 5000,
  hoverIndex,
  cursorPoint: externalCursorPoint,
  onHover,
  rotation: controlledRotation,
  onRotationChange,
  className = "",
  transparent = false,
  showControls = true,
}) => {
  if (!points || points.length === 0) return null;

  const [localRotation, setLocalRotation] = useState({ alpha: 0, beta: 45 });
  const rotation = controlledRotation || localRotation;

  const setRotation = useCallback(
    (newRotOrUpdater) => {
      if (onRotationChange) {
        // Handle functional update if necessary, but simpler to assume object for now or handle it
        const next =
          typeof newRotOrUpdater === "function"
            ? newRotOrUpdater(rotation)
            : newRotOrUpdater;
        onRotationChange(next);
      } else {
        setLocalRotation(newRotOrUpdater);
      }
    },
    [onRotationChange, rotation],
  );

  const containerRef = useRef(null);
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  const renderData = useMemo(() => {
    if (!mode3D) {
      if (points.length > 5000) {
        const sampleRate = Math.ceil(points.length / 5000);
        return points.filter((_, i) => i % sampleRate === 0);
      }
      return points;
    } else {
      const targetPoints = detailLevel;
      const sampleRate = Math.max(1, Math.ceil(points.length / targetPoints));
      return points.filter((_, i) => i % sampleRate === 0);
    }
  }, [points, mode3D, detailLevel]);

  const bounds = useMemo(() => {
    const lats = renderData.map((p) => p.lat);
    const lons = renderData.map((p) => p.lon);
    const eles = renderData.map((p) => p.ele);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minEle = Math.min(...eles);
    const maxEle = Math.max(...eles);

    const latRange = maxLat - minLat || 0.00001;
    const lonRange = maxLon - minLon || 0.00001;
    const eleRange = maxEle - minEle || 1;

    return { minLat, minLon, minEle, latRange, lonRange, eleRange };
  }, [renderData]);

  const normalizedPoints = useMemo(() => {
    const { minLat, minLon, minEle, latRange, lonRange, eleRange } = bounds;

    return renderData.map((p, idx) => ({
      x: (p.lon - minLon) / lonRange - 0.5,
      z: -((p.lat - minLat) / latRange - 0.5),
      y: (p.ele - minEle) / eleRange,
      originalIndex: Math.floor(idx * (points.length / renderData.length)),
    }));
  }, [renderData, points.length, bounds]);

  const projectedPoints = useMemo(() => {
    const { alpha, beta } = rotation;
    const radAlpha = (alpha * Math.PI) / 180;
    const radBeta = (beta * Math.PI) / 180;
    const cosA = Math.cos(radAlpha);
    const sinA = Math.sin(radAlpha);
    const cosB = Math.cos(radBeta);
    const sinB = Math.sin(radBeta);

    if (!mode3D) {
      // 2D Rotation Logic
      return normalizedPoints.map((p) => {
        const rx = p.x * cosA - p.z * sinA;
        const rz = p.x * sinA + p.z * cosA;
        return {
          sx: 50 + rx * 80,
          sy: 50 + rz * 80,
          originalIndex: p.originalIndex,
        };
      });
    } else {
      return normalizedPoints.map((p) => {
        const { sx, sy } = project3D(p.x, p.y, p.z, cosA, sinA, cosB, sinB);
        return { sx, sy, originalIndex: p.originalIndex };
      });
    }
  }, [normalizedPoints, rotation, mode3D]);

  const projectedPath = useMemo(() => {
    return projectedPoints.map((p) => `${p.sx},${p.sy}`).join(" ");
  }, [projectedPoints]);

  const gridLines = useMemo(() => {
    if (!mode3D) return [];

    const lines = [];
    const step = 0.25;
    const { alpha, beta } = rotation;
    const radAlpha = (alpha * Math.PI) / 180;
    const radBeta = (beta * Math.PI) / 180;
    const cosA = Math.cos(radAlpha);
    const sinA = Math.sin(radAlpha);
    const cosB = Math.cos(radBeta);
    const sinB = Math.sin(radBeta);

    for (let x = -0.5; x <= 0.501; x += step) {
      const start = project3D(x, 0, -0.5, cosA, sinA, cosB, sinB);
      const end = project3D(x, 0, 0.5, cosA, sinA, cosB, sinB);
      lines.push({ x1: start.sx, y1: start.sy, x2: end.sx, y2: end.sy });
    }
    for (let z = -0.5; z <= 0.501; z += step) {
      const start = project3D(-0.5, 0, z, cosA, sinA, cosB, sinB);
      const end = project3D(0.5, 0, z, cosA, sinA, cosB, sinB);
      lines.push({ x1: start.sx, y1: start.sy, x2: end.sx, y2: end.sy });
    }
    return lines;
  }, [rotation, mode3D]);

  const northMarker = useMemo(() => {
    // Show marker in both 2D and 3D
    const { alpha, beta } = rotation;
    const radAlpha = (alpha * Math.PI) / 180;
    const radBeta = (beta * Math.PI) / 180;
    const cosA = Math.cos(radAlpha);
    const sinA = Math.sin(radAlpha);
    const cosB = Math.cos(radBeta);
    const sinB = Math.sin(radBeta);

    if (!mode3D) {
      // 2D Projection for North Marker (z = -0.55)
      // We use same logic as points but for specific coordinate
      const pX = 0;
      const pZ = -0.55;
      const rx = pX * cosA - pZ * sinA;
      const rz = pX * sinA + pZ * cosA;
      return { sx: 50 + rx * 80, sy: 50 + rz * 80 };
    }

    return project3D(0, 0, -0.55, cosA, sinA, cosB, sinB);
  }, [rotation, mode3D]);

  const cursorPoint = useMemo(() => {
    // 1. External Interpolated Point (Smooth Animation)
    if (externalCursorPoint) {
      const { minLat, minLon, minEle, latRange, lonRange, eleRange } = bounds;

      // Normalize
      const valLat =
        externalCursorPoint.lat !== undefined
          ? externalCursorPoint.lat
          : externalCursorPoint.x;
      const valLon =
        externalCursorPoint.lon !== undefined
          ? externalCursorPoint.lon
          : externalCursorPoint.y;

      const nx = (externalCursorPoint.lon - minLon) / lonRange - 0.5;
      const nz = -((externalCursorPoint.lat - minLat) / latRange - 0.5);
      const ny = (externalCursorPoint.ele - minEle) / eleRange;

      const { alpha, beta } = rotation;
      const radAlpha = (alpha * Math.PI) / 180;
      const radBeta = (beta * Math.PI) / 180;
      const cosA = Math.cos(radAlpha);
      const sinA = Math.sin(radAlpha);
      const cosB = Math.cos(radBeta);
      const sinB = Math.sin(radBeta);

      if (!mode3D) {
        const rx = nx * cosA - nz * sinA;
        const rz = nx * sinA + nz * cosA;
        return { sx: 50 + rx * 80, sy: 50 + rz * 80 };
      }
      return project3D(nx, ny, nz, cosA, sinA, cosB, sinB);
    }

    // 2. Fallback to hoverIndex snapping
    if (hoverIndex !== null && hoverIndex >= 0 && hoverIndex < points.length) {
      let bestP = null;
      let minIdxDiff = Infinity;
      for (const p of projectedPoints) {
        const diff = Math.abs(p.originalIndex - hoverIndex);
        if (diff < minIdxDiff) {
          minIdxDiff = diff;
          bestP = p;
        }
      }
      return bestP;
    }
    return null;
  }, [
    externalCursorPoint,
    hoverIndex,
    points.length,
    bounds,
    rotation,
    mode3D,
    projectedPoints,
  ]);

  const handleMouseDown = (e) => {
    e.stopPropagation(); // Stop DraggableTile
    isDragging.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (isDragging.current) {
      e.stopPropagation(); // Stop DraggableTile
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;
      lastMousePos.current = { x: e.clientX, y: e.clientY };

      requestAnimationFrame(() => {
        setRotation((prev) => ({
          alpha: (prev.alpha - deltaX * 0.5) % 360,
          beta: mode3D
            ? Math.max(10, Math.min(90, prev.beta + deltaY * 0.5))
            : prev.beta,
        }));
      });
      return;
    }

    if (onHover && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
      const mouseY = ((e.clientY - rect.top) / rect.height) * 100;

      let bestDist = Infinity;
      let bestOriginalIndex = -1;

      for (const p of projectedPoints) {
        const dx = p.sx - mouseX;
        const dy = p.sy - mouseY;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          bestOriginalIndex = p.originalIndex;
        }
      }

      if (bestDist < 100) {
        onHover(bestOriginalIndex);
      }
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const startPoint = projectedPath.split(" ")[0] || "0,0";
  const endPoint = projectedPath.split(" ").slice(-1)[0] || "0,0";

  const floorPoints = useMemo(() => {
    if (!mode3D) return "";
    const corners = [
      { x: -0.5, z: -0.5 },
      { x: 0.5, z: -0.5 },
      { x: 0.5, z: 0.5 },
      { x: -0.5, z: 0.5 },
    ];
    const { alpha, beta } = rotation;
    const radAlpha = (alpha * Math.PI) / 180;
    const radBeta = (beta * Math.PI) / 180;
    const cosA = Math.cos(radAlpha);
    const sinA = Math.sin(radAlpha);
    const cosB = Math.cos(radBeta);
    const sinB = Math.sin(radBeta);

    return corners
      .map((c) => {
        const p = project3D(c.x, 0, c.z, cosA, sinA, cosB, sinB);
        return `${p.sx},${p.sy}`;
      })
      .join(" ");
  }, [rotation, mode3D]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-64 flex items-center justify-center p-4 rounded-xl border overflow-hidden relative select-none ${transparent ? "" : "bg-zinc-950/30 border-zinc-800/30"} ${mode3D ? "cursor-move" : "cursor-crosshair"} ${className}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        handleMouseUp();
        if (onHover) onHover(null);
      }}
    >
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full drop-shadow-[0_0_8px_rgba(251,113,133,0.3)] overflow-visible"
      >
        {/* 3D REFERENCE PLANE & GRID */}
        {mode3D && (
          <>
            <polygon
              points={floorPoints}
              fill="rgba(255,255,255,0.03)"
              stroke="none"
            />
            {gridLines.map((line, i) => (
              <line
                key={i}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="0.5"
              />
            ))}
            {northMarker && (
              <text
                x={northMarker.sx}
                y={northMarker.sy}
                textAnchor="middle"
                fontSize="6"
                fill="#10b981"
                fontWeight="bold"
              >
                N
              </text>
            )}
          </>
        )}

        <polyline
          points={projectedPath}
          fill="none"
          stroke="url(#routeGradient)"
          strokeWidth={mode3D ? 1.5 : 1}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <defs>
          <linearGradient id="routeGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fdba74" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
        </defs>
        <circle
          cx={startPoint.split(",")[0]}
          cy={startPoint.split(",")[1]}
          r={2}
          fill="#fdba74"
        />
        <circle
          cx={endPoint.split(",")[0]}
          cy={endPoint.split(",")[1]}
          r={2}
          fill="#fb7185"
        />

        {cursorPoint && (
          <circle
            cx={cursorPoint.sx}
            cy={cursorPoint.sy}
            r={4}
            fill="white"
            stroke="#fb7185"
            strokeWidth="1"
            className="animate-pulse"
          />
        )}
      </svg>

      {mode3D && showControls && (
        <div className="absolute bottom-3 right-3 flex items-center gap-2 bg-zinc-900/80 px-2 py-1 rounded-lg border border-zinc-700/50 pointer-events-none">
          <Rotate3d size={12} className="text-rose-400" />
          <span className="text-[10px] text-zinc-300">Obracaj / Pochylaj</span>
        </div>
      )}
    </div>
  );
};

// --- TELEMETRIA / ODTWARZANIE ---

const Speedometer = ({ speed = 0, max = 100, size = 200, className = "" }) => {
  const radius = 80;
  const center = 100;
  const startAngle = -120;
  const endAngle = 120;
  const strokeWidth = 12;

  // Convert degrees to radians and get coordinates
  const getCoords = (deg) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad),
    };
  };

  const start = getCoords(startAngle);
  const end = getCoords(endAngle);

  // SVG Path 'd' attribute for the arc
  const d = [
    "M",
    start.x,
    start.y,
    "A",
    radius,
    radius,
    0,
    endAngle - startAngle > 180 ? 1 : 0,
    1,
    end.x,
    end.y,
  ].join(" ");

  // Calculate arc length for dasharray
  const arcLen = 2 * Math.PI * radius * ((endAngle - startAngle) / 360);

  // Animation value
  const val = Math.max(0, Math.min(speed, max));
  const percent = val / max;
  const offset = arcLen * (1 - percent);

  // Generate ticks dynamically based on max speed
  let step = 5;
  if (max <= 40) step = 2;
  else if (max > 140) step = 10;

  const tickCount = Math.floor(max / step) + 1;
  const ticks = [];

  for (let i = 0; i < tickCount; i++) {
    const currentVal = i * step;
    if (currentVal > max) break;

    const p = currentVal / max; // 0 to 1 position
    const angle = startAngle + p * 240;
    const tPos = getCoords(angle);

    // Move tick slightly inward
    // We can use same math with radius-15
    const rad = ((angle - 90) * Math.PI) / 180;
    const rIn = radius - 18;
    const xIn = center + rIn * Math.cos(rad);
    const yIn = center + rIn * Math.sin(rad);

    ticks.push({
      x1: tPos.x,
      y1: tPos.y,
      x2: xIn,
      y2: yIn,
      isMajor: currentVal % 10 === 0,
      value: currentVal,
    });
  }

  // Correction: If we have too few ticks, maybe make all major?
  // If tickCount <= 6, all major?
  // Let's keep logic simple: Every even index is Major (longer/brighter).
  // But wait, if step is 20. 0(Major), 20(Minor), 40(Major).
  // Probably better to treat integers like multiples of 20 or 50 as major?
  // Original logic was pure index based. Let's keep index based for coherence.

  return (
    <div
      className={`relative flex flex-col items-center justify-center font-sans select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="speedGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fdba74" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
          <filter id="glow-speed" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track Background */}
        <path
          d={d}
          fill="none"
          stroke="#27272a"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Ticks (Subtle) */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.isMajor ? "#52525b" : "#3f3f46"}
            strokeWidth={t.isMajor ? 3 : 1}
            strokeLinecap="round"
          />
        ))}

        {/* Progress Value */}
        <path
          d={d}
          fill="none"
          stroke="url(#speedGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${arcLen}`}
          strokeDashoffset={offset}
          filter="url(#glow-speed)"
          className="transition-[stroke-dashoffset] duration-300 ease-out"
        />
      </svg>

      {/* Digital Readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center mt-6">
        <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-300 to-rose-400 drop-shadow-[0_0_10px_rgba(251,113,133,0.5)] tracking-tighter">
          {Math.round(val)}
        </span>
        <span className="text-zinc-400 text-xs font-bold uppercase tracking-[0.2em] opacity-90 drop-shadow-md">
          km/h
        </span>
      </div>
    </div>
  );
};

const DraggableTile = ({
  item,
  onUpdate,
  selectedId,
  onSelect,
  scaleData, // { containerScale }
  children,
}) => {
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onSelect(item.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = item.x;
    const initialY = item.y;

    const handleMouseMove = (ev) => {
      const dx = (ev.clientX - startX) / scaleData;
      const dy = (ev.clientY - startY) / scaleData;
      onUpdate(item.id, { x: initialX + dx, y: initialY + dy });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleScaleCtx = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const startY = e.clientY;
    const startScale = item.scale || 1;

    const handleMouseMove = (ev) => {
      const dy = (ev.clientY - startY) * 0.005;
      const newScale = Math.max(0.1, startScale + dy);
      onUpdate(item.id, { scale: newScale });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const isSelected = selectedId === item.id;

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`absolute cursor-move group select-none ${isSelected ? "z-50" : "z-10"}`} // z-index boost handled by parent ideally but this works OK
      style={{
        left: item.x,
        top: item.y,
        transform: `scale(${item.scale || 1})`,
        transformOrigin: "top left",
      }}
    >
      <div
        className={`relative transition-all duration-200 p-3 ${
          isSelected
            ? "ring-2 ring-rose-500 bg-zinc-900/40 rounded-xl backdrop-blur-sm"
            : "hover:ring-1 hover:ring-zinc-700/50 rounded-xl"
        }`}
      >
        {children}

        {/* Info & Controls overlay */}
        {isSelected && (
          <>
            <div className="absolute -top-6 left-0 bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none shadow-lg z-50">
              x:{Math.round(item.x)} y:{Math.round(item.y)} s:
              {(item.scale || 1).toFixed(2)}
            </div>

            <div
              onMouseDown={handleScaleCtx}
              className="absolute -bottom-3 -right-3 w-6 h-6 flex items-center justify-center cursor-ns-resize bg-zinc-800 border border-zinc-600 rounded-full text-zinc-300 hover:text-white hover:bg-rose-500 shadow-lg z-50"
              title="Przeciągnij góra/dół aby skalować"
            >
              <Maximize size={12} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const RESOLUTIONS = [
  { w: 1280, h: 720, label: "720p HD" },
  { w: 1920, h: 1080, label: "1080p FHD" },
  { w: 2560, h: 1440, label: "1440p QHD" },
  { w: 3840, h: 2160, label: "4K UHD" },
];

const TelemetryView = ({
  viewData,
  currentPoint,
  hoverIndex,
  isPlaying,
  onClose,
  togglePlay,
  toggleSpeed,
  playbackSpeed,
  settings,
  setSettings,
  onSeek, // New prop
}) => {
  // State for Virtual Studio
  const [resolution, setResolution] = useState(RESOLUTIONS[1]); // Default 1080p
  const [containerScale, setContainerScale] = useState(1);
  const containerRef = useRef(null);
  const recordingCanvasRef = useRef(null); // Reference for native recording

  // Widgets State
  const [widgets, setWidgets] = useState([
    { id: "speed1", type: "speedometer", x: 100, y: 700, scale: 1.5 },
    {
      id: "map1",
      type: "map",
      x: 1200,
      y: 50,
      scale: 1.0,
      rotation: { alpha: 0, beta: 45 },
    },
  ]);
  const [selectedWidgetId, setSelectedWidgetId] = useState(null);

  const [bgMode, setBgMode] = useState("default"); // default, green, blue, magenta
  const [bgOpacity, setBgOpacity] = useState(0.3);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [autoScaleFactor, setAutoScaleFactor] = useState(0.25); // 1/4 by default
  const [layoutMargin, setLayoutMargin] = useState(50);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Normalizacja punktów dla Canvas (kopia logiki z RoutePreview)
  const normalizedPointsRef = useRef([]);
  useEffect(() => {
    if (!viewData?.points?.length) return;
    const points = viewData.points;
    // Simple version of normalization logic
    const lats = points.map((p) => p.lat);
    const lons = points.map((p) => p.lon);
    const eles = points.map((p) => p.ele);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minEle = Math.min(...eles);
    const maxEle = Math.max(...eles);
    const latRange = maxLat - minLat || 0.00001;
    const lonRange = maxLon - minLon || 0.00001;
    const eleRange = maxEle - minEle || 1;

    // Store bounds for cursor normalization
    normalizedPointsRef.current = {
      points: points.map((p, idx) => ({
        x: (p.lon - minLon) / lonRange - 0.5,
        z: -((p.lat - minLat) / latRange - 0.5),
        y: (p.ele - minEle) / eleRange,
        speed: p.smoothSpeed || p.speed || 0,
      })),
      bounds: {
        minLat,
        minLon,
        minEle,
        latRange,
        lonRange,
        eleRange,
        maxSpeed: viewData.summary.maxSpeed || 100,
      },
      summary: viewData.summary,
    };
  }, [viewData]); // Assuming viewData structure is stable, points array is new reference

  // --- RENDER LOOP FOR RECORDING CANVAS ---
  useEffect(() => {
    const canvas = recordingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });

    let animId;
    const render = () => {
      // 1. Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 2. Background (If not transparent mode, but usually we Record Transparent)
      // The user specifically asked for "Transparent" capability.
      // If bgMode is default (black), we might want to draw black?
      // Or if bgMode is Green/Blue/Magenta we draw that.
      // If "default" acts as "Transparent" for recording, we leave clear.
      // BUT, currently bgMode="default" draws bg-zinc-950 on screen.
      // Let's assume User wants:
      // - Screen: Sees Background
      // - Recording: Sees Transparent if bgMode='default' OR maybe a specific toggle?
      // Re-reading request: "Dlaczego to działa z przezroczystością? ... tło canvasa jest przezroczyste."
      // So we should NOT draw background if we want transparency.
      // Let's draw background ONLY if it's a specific color intended for chroma key.
      if (bgMode !== "default") {
        ctx.fillStyle =
          bgMode === "green"
            ? "#00ff00"
            : bgMode === "blue"
              ? "#0000ff"
              : "#ff00ff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // 3. Draw Widgets
      widgets.forEach((w) => {
        ctx.save();
        ctx.translate(w.x, w.y);
        ctx.scale(w.scale || 1, w.scale || 1);

        // Correction for DraggableTile p-3 (12px) padding
        // This ensures the canvas drawing aligns with the DOM content inside the frame
        ctx.translate(12, 12);

        if (w.type === "speedometer") {
          const spd = currentPoint?.smoothSpeed || currentPoint?.speed || 0;
          const max = viewData.summary.maxSpeed
            ? Math.ceil(parseFloat(viewData.summary.maxSpeed) / 10) * 10
            : 100;
          drawCanvasSpeedometer(ctx, spd, max, bgOpacity);
        } else if (w.type === "map" || w.type === "map-speed") {
          if (normalizedPointsRef.current?.points) {
            drawCanvasMap(
              ctx,
              normalizedPointsRef.current.points,
              w.rotation || { alpha: 0, beta: 45 },
              settings.visualMode3D,
              currentPoint,
              normalizedPointsRef.current.bounds,
              bgOpacity,
              w.type === "map-speed", // colorize
              normalizedPointsRef.current.summary, // summary
            );
          }
        } else if (w.type === "elevation") {
          drawCanvasElevation(ctx, currentPoint?.ele || 0, bgOpacity);
        } else if (w.type === "elevation-profile") {
          drawCanvasElevationProfile(
            ctx,
            viewData.points,
            currentPoint,
            bgOpacity,
          );
        }

        ctx.restore();
      });

      animId = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animId);
  }, [
    widgets,
    currentPoint,
    viewData,
    settings.visualMode3D,
    bgMode,
    bgOpacity,
  ]);

  // --- DRAWING HELPERS ---
  const drawCanvasElevation = (ctx, ele, opacity = 0.3) => {
    const w = 200;
    const h = 120;

    // Background
    if (opacity > 0) {
      if (ctx.roundRect) ctx.roundRect(0, 0, w, h, 20);
      else ctx.rect(0, 0, w, h);
      ctx.fillStyle = `rgba(0,0,0,${opacity})`;
      ctx.fill();
    }

    // Icon Area
    ctx.fillStyle = "rgba(251, 113, 133, 0.1)"; // rose-500/10
    ctx.beginPath();
    ctx.arc(40, 40, 20, 0, Math.PI * 2);
    ctx.fill();

    // Text
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // Value
    ctx.font = "900 48px sans-serif";
    ctx.fillStyle = "#fdba74"; // orange-300
    ctx.shadowColor = "rgba(253, 186, 116, 0.5)";
    ctx.shadowBlur = 10;
    ctx.textAlign = "right";
    ctx.fillText(Math.round(ele), w - 20, 50);
    ctx.shadowBlur = 0;

    // Label
    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "#a1a1aa"; // zinc-400
    ctx.fillText("m n.p.m.", w - 20, 85);

    ctx.textAlign = "left";
    ctx.fillStyle = "#fb7185"; // rose-400
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("ALT", 25, 85);
  };

  const drawCanvasElevationProfile = (ctx, points, cursor, opacity = 0.3) => {
    const w = 600;
    const h = 200;
    const pad = 20;
    const plotW = w - pad * 2;
    const plotH = h - pad * 2;

    // Background
    if (opacity > 0) {
      if (ctx.roundRect) ctx.roundRect(0, 0, w, h, 20);
      else ctx.rect(0, 0, w, h);
      ctx.fillStyle = `rgba(0,0,0,${opacity})`;
      ctx.fill();
    }

    // Min/Max Ele for scaling
    // Optimization: Should be calculated once in normalizedPointsRef or similar
    // Doing it here is okay for 60fps if points < 5000 approx
    const eles = points.map((p) => p.ele);
    const minEle = Math.min(...eles);
    const maxEle = Math.max(...eles);
    const rangeEle = maxEle - minEle || 1;

    // Normalize Distances
    const startDist = points[0].cumDist;
    const endDist = points[points.length - 1].cumDist;
    const totalDist = endDist - startDist || 1;

    ctx.translate(pad, pad); // Move to plot area

    // Draw Fill
    ctx.beginPath();
    ctx.moveTo(0, plotH);

    points.forEach((p) => {
      const x = ((p.cumDist - startDist) / totalDist) * plotW;
      const y = plotH - ((p.ele - minEle) / rangeEle) * plotH;
      ctx.lineTo(x, y);
    });

    ctx.lineTo(plotW, plotH);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, 0, 0, plotH);
    grad.addColorStop(0, "rgba(251, 113, 133, 0.5)"); // rose
    grad.addColorStop(1, "rgba(251, 113, 133, 0.0)");
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw Line
    ctx.beginPath();
    points.forEach((p, i) => {
      const x = ((p.cumDist - startDist) / totalDist) * plotW;
      const y = plotH - ((p.ele - minEle) / rangeEle) * plotH;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = "#fb7185";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Cursor
    if (cursor) {
      const cx = ((cursor.cumDist - startDist) / totalDist) * plotW;
      const cy = plotH - ((cursor.ele - minEle) / rangeEle) * plotH;

      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, plotH);
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#fff";
      ctx.fill();
    }

    // Labels
    ctx.font = "10px sans-serif";
    ctx.fillStyle = "#71717a"; // zinc-500
    ctx.textAlign = "left";
    ctx.fillText(`${Math.round(minEle)}m`, 0, plotH - 5);
    ctx.textAlign = "right";
    ctx.fillText(`${Math.round(maxEle)}m`, plotW, 10);
  };

  const drawCanvasSpeedometer = (ctx, speed, max, opacity = 0.3) => {
    const size = 300; // Original SVG size logic
    const cx = 150; // Half of 300? No, Speedometer component uses 200x200 viewBox but size=300 div.
    // We scaled context, so we draw in local coordinate system.
    // Let's assume local "size" is 300x300.

    // Speedometer component: viewBox 0 0 200 200. Div size=300.
    // So scale factor = 1.5.
    ctx.scale(300 / 200, 300 / 200);

    // Defs
    const radius = 80;
    const center = 100;

    // Optional background for chroma keying
    ctx.beginPath();
    ctx.arc(center, center, radius + 10, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,0,0,${opacity})`;
    ctx.fill();

    const startAngle = -120;
    const endAngle = 120;

    const rad = (deg) => ((deg - 90) * Math.PI) / 180;

    // Track
    ctx.beginPath();
    ctx.arc(center, center, radius, rad(startAngle), rad(endAngle));
    ctx.lineWidth = 12;
    ctx.strokeStyle = "#27272a";
    ctx.lineCap = "round";
    ctx.stroke();

    // Active Arc
    const val = Math.max(0, Math.min(speed, max));
    const percent = val / max;
    const activeEnd = startAngle + (endAngle - startAngle) * percent;

    if (percent > 0) {
      ctx.beginPath();
      ctx.arc(center, center, radius, rad(startAngle), rad(activeEnd));

      // Gradient
      const grad = ctx.createLinearGradient(0, 0, 200, 0);
      grad.addColorStop(0, "#fdba74");
      grad.addColorStop(1, "#fb7185");
      ctx.strokeStyle = grad;

      // Glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#fb7185";

      ctx.stroke();

      // Reset shadow
      ctx.shadowBlur = 0;
    }

    // Ticks
    let step = 5;
    if (max <= 40) step = 2;
    else if (max > 140) step = 10;

    const tickCount = Math.floor(max / step) + 1;

    for (let i = 0; i < tickCount; i++) {
      const currentVal = i * step;
      if (currentVal > max) break;

      const p = currentVal / max;
      const a = startAngle + p * 240;
      const isMajor = currentVal % 10 === 0;

      const angleRad = rad(a);
      const c = Math.cos(angleRad);
      const s = Math.sin(angleRad);

      ctx.beginPath();
      ctx.moveTo(
        center + (80 - (isMajor ? 10 : 6)) * c,
        center + (80 - (isMajor ? 10 : 6)) * s,
      );
      ctx.lineTo(
        center + (80 + (isMajor ? 2 : 0)) * c,
        center + (80 + (isMajor ? 2 : 0)) * s,
      );
      ctx.lineWidth = isMajor ? 2 : 1;
      ctx.strokeStyle = isMajor
        ? "rgba(255,255,255,0.8)"
        : "rgba(255,255,255,0.3)";
      ctx.stroke();
    }

    // Text
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 48px sans-serif";
    // Gradient Text workaround
    ctx.fillStyle = "#fb7185";

    // Text Shadow
    ctx.shadowColor = "rgba(251, 113, 133, 0.5)";
    ctx.shadowBlur = 10;
    ctx.fillText(Math.round(val), center, center + 30);
    ctx.shadowBlur = 0; // Reset

    ctx.font = "bold 12px sans-serif";
    ctx.fillStyle = "#a1a1aa"; // zinc-400
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 4;
    ctx.fillText("KM/H", center, center + 55);
    ctx.shadowBlur = 0;
  };

  const drawCanvasMap = (
    ctx,
    points,
    rotation,
    mode3D,
    cursor,
    bounds,
    opacity = 0.3,
    colorize = false,
    summary = {},
  ) => {
    // Center context first
    ctx.save();
    ctx.translate(300, 200); // Center of box

    const { alpha, beta } = rotation;
    const radAlpha = (alpha * Math.PI) / 180;
    const radBeta = (beta * Math.PI) / 180;
    const cosA = Math.cos(radAlpha);
    const sinA = Math.sin(radAlpha);
    const cosB = Math.cos(radBeta);
    const sinB = Math.sin(radBeta);

    // Helpers
    const proj = (x, y, z) => project3D(x, y, z, cosA, sinA, cosB, sinB);

    // 1. Calculate Projected Points & Bounds
    // First pass: Get raw projected coordinates (centered at 0,0 ideally)
    const rawPoints = [];
    let rMinX = Infinity,
      rMaxX = -Infinity,
      rMinY = Infinity,
      rMaxY = -Infinity;

    const rawFloor = [];

    // Process Path Points
    points.forEach((p) => {
      const pt = mode3D
        ? proj(p.x, p.y, p.z)
        : {
            sx: (p.x * cosA - p.z * sinA) * 100, // scaled up for precision
            sy: (p.x * sinA + p.z * cosA) * 100,
          };
      // pt.sx/sy are arbitrary. Let's maximize usage.
      // The original proj function returns roughly 0-100 range centered at 50?
      // Let's assume we just want relative coords.
      // Actually original project3D might be returning something else.
      // Let's just use the values as is, and find bounds.

      let x, y;
      if (mode3D) {
        x = pt.sx - 50;
        y = pt.sy - 50;
      } else {
        x = pt.sx;
        y = pt.sy;
      }

      rawPoints.push({ x, y, speed: p.speed });
      if (x < rMinX) rMinX = x;
      if (x > rMaxX) rMaxX = x;
      if (y < rMinY) rMinY = y;
      if (y > rMaxY) rMaxY = y;
    });

    // Process Floor (to include in bounds)
    if (mode3D) {
      const floorCorners = [
        { x: -0.5, z: -0.5 },
        { x: 0.5, z: -0.5 },
        { x: 0.5, z: 0.5 },
        { x: -0.5, z: 0.5 },
      ];
      floorCorners.forEach((c) => {
        const p = proj(c.x, 0, c.z);
        let x = p.sx - 50;
        let y = p.sy - 50;
        rawFloor.push({ x, y });
        if (x < rMinX) rMinX = x;
        if (x > rMaxX) rMaxX = x;
        if (y < rMinY) rMinY = y;
        if (y > rMaxY) rMaxY = y;
      });
    } else {
      // safe fallback for empty track in 2D
      if (rMinX === Infinity) {
        rMinX = -1;
        rMaxX = 1;
        rMinY = -1;
        rMaxY = 1;
      }
    }

    // Calculate Scale to Fit 600x400 with padding
    const padding = 20; // Internal padding inside the widget
    const availW = 600 - padding * 2;
    const availH = 400 - padding * 2;

    const rangeW = rMaxX - rMinX || 1;
    const rangeH = rMaxY - rMinY || 1;

    const scaleW = availW / rangeW;
    const scaleH = availH / rangeH;
    const scale = Math.min(scaleW, scaleH); // Fit within

    // Center of the raw bounds
    const cenX = (rMinX + rMaxX) / 2;
    const cenY = (rMinY + rMaxY) / 2;

    // Map raw points to screen points
    const screenPoints = rawPoints.map((p) => ({
      x: (p.x - cenX) * scale,
      y: (p.y - cenY) * scale,
      speed: p.speed,
    }));

    // Recalculate bounds for Background Drawing (exact covered area)
    let minX = (-rangeW / 2) * scale;
    let maxX = (rangeW / 2) * scale;
    let minY = (-rangeH / 2) * scale;
    let maxY = (rangeH / 2) * scale;

    // 2. Draw Dynamic Background
    if (opacity > 0) {
      const padding = 40; // Increased padding for better look
      const bx = minX - padding;
      const by = minY - padding;
      const bw = maxX - minX + padding * 2;
      const bh = maxY - minY + padding * 2;

      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(bx, by, bw, bh, 40); // Large rounded corners
      } else {
        ctx.rect(bx, by, bw, bh);
      }
      ctx.fillStyle = `rgba(0,0,0,${opacity})`;
      ctx.fill();
    }

    // 3. Draw 3D Plane & Grid (clipped to logic or standard?)
    if (mode3D) {
      // Recalculate floor with new scale/center
      const floorCorners = [
        { x: -0.5, z: -0.5 },
        { x: 0.5, z: -0.5 },
        { x: 0.5, z: 0.5 },
        { x: -0.5, z: 0.5 },
      ];
      ctx.beginPath();
      floorCorners.forEach((c, i) => {
        const p = proj(c.x, 0, c.z);
        const x = (p.sx - 50 - cenX) * scale;
        const y = (p.sy - 50 - cenY) * scale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fill();

      // Grid Lines
      const step = 0.25;
      ctx.beginPath();
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = "rgba(255,255,255,0.1)";

      const drawLine = (p1, p2) => {
        const x1 = (p1.sx - 50 - cenX) * scale;
        const y1 = (p1.sy - 50 - cenY) * scale;
        const x2 = (p2.sx - 50 - cenX) * scale;
        const y2 = (p2.sy - 50 - cenY) * scale;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      };

      // X lines
      for (let xPos = -0.5; xPos <= 0.501; xPos += step) {
        drawLine(proj(xPos, 0, -0.5), proj(xPos, 0, 0.5));
      }
      // Z lines
      for (let zPos = -0.5; zPos <= 0.501; zPos += step) {
        drawLine(proj(-0.5, 0, zPos), proj(0.5, 0, zPos));
      }
      ctx.stroke();

      // North Marker (z = -0.55)
      const nPosRaw = proj(0, 0, -0.55);
      const nx = (nPosRaw.sx - 50 - cenX) * scale;
      const ny = (nPosRaw.sy - 50 - cenY) * scale;

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 24px sans-serif"; // Scaled up (6 * 4)
      ctx.fillStyle = "#10b981";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#10b981";
      ctx.fillText("N", nx, ny);
      ctx.shadowBlur = 0;
    }

    // 4. Draw Path
    if (colorize) {
      const maxSpeed = summary.maxSpeed || 100;

      // Draw per-segment for coloring
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowBlur = 4;
      ctx.shadowColor = "#000"; // Generic shadow
      ctx.lineWidth = mode3D ? 3 : 2;

      for (let i = 0; i < screenPoints.length - 1; i++) {
        const p1 = screenPoints[i];
        const p2 = screenPoints[i + 1];

        // Calc color
        const speed = p1.speed || 0;
        const ratio = Math.min(1, Math.max(0, speed / maxSpeed));
        
        // Simple Heatmap: Blue (0) -> Green -> Yellow -> Red (1)
        // or more aesthetic: Indigo -> Purple -> Orange -> Rose
        // Let's use HSL for smooth transition
        // High speed (1.0) = Red (0)
        // Low speed (0.0) = Green (120)
        // Avoid Blue (240) for chroma safety
        const hue = 120 - ratio * 120;
        const color = `hsl(${hue}, 80%, 50%)`;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color;
        ctx.shadowColor = color; // Colored Glow
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    } else {
      ctx.beginPath();
      screenPoints.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });

      // Create gradient for path to match SVG
      const grad = ctx.createLinearGradient(-200, -200, 200, 200);
      grad.addColorStop(0, "#fdba74");
      grad.addColorStop(1, "#fb7185");

      ctx.strokeStyle = grad;
      ctx.lineWidth = mode3D ? 3 : 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowBlur = 4;
      ctx.shadowColor = "#fb7185";
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw Cursor
    if (cursor && bounds) {
      const { minLat, minLon, minEle, latRange, lonRange, eleRange } = bounds;
      // Normalize
      const valLat = cursor.lat !== undefined ? cursor.lat : cursor.x;
      const valLon = cursor.lon !== undefined ? cursor.lon : cursor.y;

      const nx = (valLon - minLon) / lonRange - 0.5;
      const nz = -((valLat - minLat) / latRange - 0.5);
      const ny = (cursor.ele - minEle) / eleRange;

      let cx, cy;
      if (!mode3D) {
        // 2D Logic
        const sx = (nx * cosA - nz * sinA) * 100;
        const sy = (nx * sinA + nz * cosA) * 100;
        cx = (sx - cenX) * scale;
        cy = (sy - cenY) * scale;
      } else {
        const cp = proj(nx, ny, nz);
        cx = (cp.sx - 50 - cenX) * scale;
        cy = (cp.sy - 50 - cenY) * scale;
      }

      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#fff";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "#fff";
      ctx.fill();
      ctx.strokeStyle = "#fb7185";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  };

  const handleUpdateWidget = (id, newProps) => {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, ...newProps } : w)),
    );
  };

  const handleStartRecording = async () => {
    try {
      if (!recordingCanvasRef.current) return;

      const stream = recordingCanvasRef.current.captureStream(60); // 60 FPS
      const mimeType = "video/webm; codecs=vp9"; // Chrome supports this well

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 25000000,
      });

      // Auto-play when recording starts if not already playing
      if (!isPlaying) {
        togglePlay();
      }

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, {
          type: "video/webm",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `skitracker_telemetry_${resolution.label}_${new Date().toISOString().slice(0, 19).replace(/[:]/g, "-")}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        recordedChunksRef.current = [];
        setIsRecording(false);
        setControlsVisible(true);
      };

      recorder.start();
      setIsRecording(true);
      // setControlsVisible(false); // don't hide controls
      mediaRecorderRef.current = recorder;
    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Błąd nagrywania: " + err.message);
    }
  };

  const handleStopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  };
  // ... Layout Presets ... (Keeping original code for layout presets)
  // Layout Presets
  const toggleWidget = (type) => {
    setWidgets((prev) => {
      const exists = prev.find((w) => w.type === type);
      if (exists) {
        return prev.filter((w) => w.type !== type);
      }
      // Add new
      const id = type + Math.random().toString(36).substr(2, 5);
      const defaults = {
        speedometer: { x: 50, y: resolution.h - 350, scale: 1.5 },
        map: {
          x: resolution.w - 650,
          y: 50,
          scale: 1.0,
          rotation: { alpha: 0, beta: 45 },
        },
        "map-speed": {
          x: resolution.w - 650,
          y: 50,
          scale: 1.0,
          rotation: { alpha: 0, beta: 45 },
        },
        elevation: { x: 50, y: 50, scale: 1.0 },
        "elevation-profile": {
          x: resolution.w / 2 - 300,
          y: resolution.h - 250,
          scale: 1.0,
        },
      };
      return [...prev, { id, type, ...defaults[type] }];
    });
  };

  const handleAutoLayout = () => {
    // scale based on window height
    const targetH = resolution.h * autoScaleFactor;

    // Constants for visual corrections
    const tilePad = 12; // p-3 = 12px from DraggableTile
    const speedoInternalPad = 15; // approximate empty space in 300px speedometer box

    setWidgets((prev) => {
      const typesToReset = [
        "speedometer",
        "map",
        "elevation",
        "elevation-profile",
      ];
      let newWidgets = prev.filter((w) => !typesToReset.includes(w.type));

      // Re-add/Update Speedometer
      // Layout: Bottom-Left
      if (prev.find((w) => w.type === "speedometer")) {
        const speedScale = targetH / 300;
        const speedX =
          layoutMargin - (tilePad + speedoInternalPad) * speedScale;
        const speedY =
          resolution.h -
          layoutMargin -
          (tilePad + 300 - speedoInternalPad) * speedScale;

        newWidgets.push({
          id: prev.find((w) => w.type === "speedometer")?.id || "speed1",
          type: "speedometer",
          scale: speedScale,
          x: speedX,
          y: speedY,
        });
      }

      // Re-add/Update Map
      // Layout: Top-Right
      if (prev.find((w) => w.type === "map")) {
        const mapScale = targetH / 400;
        const mapX = resolution.w - layoutMargin - (tilePad + 600) * mapScale;
        const mapY = layoutMargin - tilePad * mapScale;

        newWidgets.push({
          id: prev.find((w) => w.type === "map")?.id || "map1",
          type: "map",
          scale: mapScale,
          rotation: prev.find((w) => w.type === "map")?.rotation || {
            alpha: 0,
            beta: 45,
          },
          x: mapX,
          y: mapY,
        });
      }

      // Re-add/Update Elevation
      // Layout: Top-Left
      if (prev.find((w) => w.type === "elevation")) {
        const eleScale = targetH / 300; // Match speedo scale feel
        const eleX = layoutMargin - tilePad * eleScale;
        const eleY = layoutMargin - tilePad * eleScale;

        newWidgets.push({
          id: prev.find((w) => w.type === "elevation")?.id || "ele1",
          type: "elevation",
          scale: eleScale,
          x: eleX,
          y: eleY,
        });
      }

      // Re-add/Update Profile
      // Layout: Bottom-Center
      if (prev.find((w) => w.type === "elevation-profile")) {
        const profScale = targetH / 400;
        const profW = 600;
        const profH = 200;
        const profX = (resolution.w - profW * profScale) / 2;
        const profY =
          resolution.h - layoutMargin - (tilePad + profH) * profScale;

        newWidgets.push({
          id: prev.find((w) => w.type === "elevation-profile")?.id || "prof1",
          type: "elevation-profile",
          scale: profScale,
          x: profX,
          y: profY,
        });
      }

      return newWidgets;
    });
  };

  const bgStyles = {
    default: "bg-zinc-950",
    green: "bg-[#00ff00]",
    blue: "bg-[#0000ff]",
    magenta: "bg-[#ff00ff]",
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-zinc-950">
      {/* CONTROLS OVERLAY (Hover/Toggle) */}
      <div
        className={`absolute top-0 left-0 right-0 p-4 flex justify-between items-start transition-opacity duration-300 z-50 ${controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <div className="flex gap-2 bg-zinc-900/90 backdrop-blur p-2 rounded-xl border border-zinc-800 shadow-xl overflow-x-auto max-w-[80vw]">
          <Button variant="secondary" size="sm" onClick={onClose} icon={X}>
            Zamknij
          </Button>

          <div className="w-px h-6 bg-zinc-800 mx-1"></div>

          <div className="flex gap-1 items-center">
            <span className="text-[10px] uppercase font-bold text-zinc-500 px-1">
              <Monitor size={12} className="inline mr-1" />
              Res:
            </span>
            {RESOLUTIONS.map((res) => (
              <button
                key={res.label}
                onClick={() => setResolution(res)}
                className={`px-2 py-1 text-xs rounded-md font-bold transition-all ${resolution.label === res.label ? "bg-rose-500 text-white" : "text-zinc-400 hover:text-zinc-200"}`}
              >
                {res.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-zinc-800 mx-1"></div>

          <div className="flex gap-1 items-center">
            <span className="text-[10px] uppercase font-bold text-zinc-500 px-1">
              <Layout size={12} className="inline mr-1" />
              Widgety:
            </span>
            <button
              onClick={() => toggleWidget("speedometer")}
              className={`p-1 hover:text-rose-300 ${widgets.find((w) => w.type === "speedometer") ? "text-rose-500" : "text-zinc-400"}`}
              title="Prędkościomierz"
            >
              <Gauge size={16} />
            </button>
            <button
              onClick={() => toggleWidget("map")}
              className={`p-1 hover:text-rose-300 ${widgets.find((w) => w.type === "map") ? "text-rose-500" : "text-zinc-400"}`}
              title="Mapa"
            >
              <MapIcon size={16} />
            </button>
            <button
              onClick={() => toggleWidget("map-speed")}
              className={`p-1 hover:text-rose-300 ${widgets.find((w) => w.type === "map-speed") ? "text-rose-500" : "text-zinc-400"}`}
              title="Mapa Termiczna (Prędkość)"
            >
              <TrendingUp size={16} />
            </button>
            <button
              onClick={() => toggleWidget("elevation")}
              className={`p-1 hover:text-rose-300 ${widgets.find((w) => w.type === "elevation") ? "text-rose-500" : "text-zinc-400"}`}
              title="Aktualna Wysokość"
            >
              <ArrowUp size={16} />
            </button>
            <button
              onClick={() => toggleWidget("elevation-profile")}
              className={`p-1 hover:text-rose-300 ${widgets.find((w) => w.type === "elevation-profile") ? "text-rose-500" : "text-zinc-400"}`}
              title="Profil Wysokościowy"
            >
              <Mountain size={16} />
            </button>
            <div className="flex items-center gap-1 mx-1 border border-zinc-700 rounded px-1">
              <button
                onClick={handleAutoLayout}
                className="p-1 text-zinc-400 hover:text-rose-300"
                title="Szybkie rozmieszczanie"
              >
                <Wand2 size={16} />
              </button>
              <select
                value={autoScaleFactor}
                onChange={(e) => setAutoScaleFactor(parseFloat(e.target.value))}
                className="bg-zinc-900 text-[10px] text-zinc-400 border-none outline-none cursor-pointer w-12"
                title="Wielkość auto-skalowania (względem wysokości ekranu)"
              >
                <option value="0.2">1/5</option>
                <option value="0.25">1/4</option>
                <option value="0.33">1/3</option>
                <option value="0.5">1/2</option>
              </select>
              <div className="w-px h-3 bg-zinc-700 mx-0.5"></div>
              <input
                type="number"
                value={layoutMargin}
                onChange={(e) =>
                  setLayoutMargin(Math.max(0, parseInt(e.target.value)))
                }
                step="10"
                className="w-10 bg-zinc-900 text-[10px] text-zinc-400 border-none outline-none text-right px-0.5"
                title="Margines layoutu (px)"
              />
              <span className="text-[9px] text-zinc-600 px-1 font-bold">
                px
              </span>
            </div>
          </div>

          <div className="w-px h-6 bg-zinc-800 mx-1"></div>

          <div className="flex gap-1 items-center">
            <Button
              variant={isRecording ? "danger" : "secondary"}
              size="xs"
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              icon={Video}
              title="Nagraj widok (Pamiętaj o wyborze Tego Okna/Karty)"
            >
              {isRecording ? "STOP (Zapisz)" : "Nagraj"}
            </Button>
          </div>

          <div className="w-px h-6 bg-zinc-800 mx-1"></div>

          <div className="flex gap-1 items-center">
            <span className="text-[10px] uppercase font-bold text-zinc-500 px-1">
              Chroma:
            </span>
            <button
              onClick={() => setBgMode("default")}
              className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-700"
              title="Off"
            ></button>
            <button
              onClick={() => setBgMode("green")}
              className="w-5 h-5 rounded-full bg-[#00ff00] border border-zinc-700"
              title="Green"
            ></button>
            <button
              onClick={() => setBgMode("blue")}
              className="w-5 h-5 rounded-full bg-[#0000ff] border border-zinc-700"
              title="Blue"
            ></button>
            <button
              onClick={() => setBgMode("magenta")}
              className="w-5 h-5 rounded-full bg-[#ff00ff] border border-zinc-700"
              title="Magenta"
            ></button>
          </div>

          <div className="w-px h-6 bg-zinc-800 mx-1"></div>

          <div className="flex gap-2 items-center px-1">
            <span className="text-[10px] uppercase font-bold text-zinc-500">
              Op:
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={bgOpacity}
              onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
              className="w-20 accent-rose-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
              title="Przeźroczystość tła widgetów"
            />
          </div>
        </div>

        <div className="bg-zinc-900/90 backdrop-blur p-2 rounded-xl border border-zinc-800 shadow-xl flex gap-1">
          <button
            onClick={() => setControlsVisible(false)}
            className="p-2 text-zinc-400 hover:text-zinc-200"
            title="Ukryj menu (Nagrywanie)"
          >
            <EyeOff size={18} />
          </button>
        </div>
      </div>

      {/* HIDDEN CONTROLS RESTORE BUTTON */}
      {!controlsVisible && (
        <button
          onClick={() => setControlsVisible(true)}
          className="absolute top-4 right-4 z-50 p-2 bg-zinc-900/30 hover:bg-zinc-900/80 text-zinc-500 hover:text-white rounded-full transition-all"
        >
          <Eye size={20} />
        </button>
      )}

      {/* MAIN CONTENT STAGE */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center relative bg-black/20"
        onMouseDown={() => setSelectedWidgetId(null)}
      >
        {/* VIRTUAL SCREEN CONTAINER */}
        <div
          style={{
            width: resolution.w,
            height: resolution.h,
            transform: `scale(${containerScale})`,
          }}
          className={`relative shadow-2xl transition-transform duration-300 ease-out origin-center ${bgMode === "default" ? "border border-zinc-800 bg-zinc-950" : bgStyles[bgMode]}`}
        >
          {/* LIVE RENDERING CANVAS (Background Layer - Same as Recording) */}
          <canvas
            ref={recordingCanvasRef}
            width={resolution.w}
            height={resolution.h}
            className="absolute top-0 left-0 pointer-events-none z-0"
          />

          {/* BACKGROUND GRID (Design Mode Only) */}
          {controlsVisible && bgMode === "default" && (
            <div
              className="absolute inset-0 opacity-10 pointer-events-none z-0"
              style={{
                backgroundImage: `linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)`,
                backgroundSize: "50px 50px",
              }}
            ></div>
          )}

          {/* RENDER WIDGETS (Interactive Layer - Transparent Content) */}
          {widgets.map((w) => (
            <DraggableTile
              key={w.id}
              item={w}
              onUpdate={handleUpdateWidget}
              scaleData={containerScale}
              selectedId={selectedWidgetId}
              onSelect={setSelectedWidgetId}
            >
              {w.type === "speedometer" && (
                <Speedometer
                  speed={currentPoint?.smoothSpeed || currentPoint?.speed || 0}
                  max={
                    viewData?.summary?.maxSpeed
                      ? Math.ceil(parseFloat(viewData.summary.maxSpeed) / 10) *
                        10
                      : 100
                  }
                  size={300}
                  className="opacity-0" // Hide DOM content, rely on Canvas
                />
              )}
              {w.type === "map" && (
                <div className="w-[600px] h-[400px] rounded-xl relative overflow-hidden group">
                  <RoutePreview
                    points={viewData.points}
                    mode3D={settings.visualMode3D}
                    detailLevel={settings.detailLevel}
                    hoverIndex={hoverIndex}
                    cursorPoint={currentPoint}
                    rotation={w.rotation}
                    onRotationChange={(r) =>
                      handleUpdateWidget(w.id, { rotation: r })
                    }
                    className="w-full h-full border-none [&>svg]:opacity-0" // Hide SVG only, keep controls
                    transparent={true}
                    showControls={false}
                  />
                  {/* Mini controls for map */}
                  {controlsVisible && (
                    <div className="absolute bottom-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() =>
                          setSettings((s) => ({
                            ...s,
                            visualMode3D: !s.visualMode3D,
                          }))
                        }
                        className="px-2 py-1 bg-black/50 text-white text-[10px] rounded"
                      >
                        {settings.visualMode3D ? "2D" : "3D"}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {w.type === "map-speed" && (
                <div className="w-[600px] h-[400px] rounded-xl relative overflow-hidden group">
                  <RoutePreview
                    points={viewData.points}
                    mode3D={settings.visualMode3D}
                    detailLevel={settings.detailLevel}
                    hoverIndex={hoverIndex}
                    cursorPoint={currentPoint}
                    rotation={w.rotation}
                    onRotationChange={(r) =>
                      handleUpdateWidget(w.id, { rotation: r })
                    }
                    className="w-full h-full border-none [&>svg]:opacity-0"
                    transparent={true}
                    showControls={false}
                  />
                  {controlsVisible && (
                    <div className="absolute bottom-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() =>
                          setSettings((s) => ({
                            ...s,
                            visualMode3D: !s.visualMode3D,
                          }))
                        }
                        className="px-2 py-1 bg-black/50 text-white text-[10px] rounded"
                      >
                        {settings.visualMode3D ? "2D" : "3D"}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {w.type === "elevation" && (
                <div className="w-[200px] h-[120px] opacity-0" />
              )}
              {w.type === "elevation-profile" && (
                <div className="w-[600px] h-[200px] opacity-0" />
              )}
            </DraggableTile>
          ))}
        </div>
      </div>

      {/* PLAYBACK CONTROLS (Floating Bottom) */}
      {controlsVisible && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900/90 backdrop-blur border border-zinc-800 p-2 rounded-2xl flex items-center gap-4 shadow-2xl z-50">
          <button
            onClick={togglePlay}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 text-zinc-900 shadow-lg shadow-rose-500/20 hover:scale-105 transition-transform"
          >
            {isPlaying ? (
              <Pause size={24} fill="currentColor" />
            ) : (
              <Play size={24} fill="currentColor" className="ml-1" />
            )}
          </button>

          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-zinc-500 uppercase">
              Prędkość
            </span>
            <button
              onClick={toggleSpeed}
              className="font-mono text-zinc-200 font-bold hover:text-rose-400 w-12 text-center"
            >
              x{playbackSpeed}
            </button>
          </div>

          <div className="w-px h-8 bg-zinc-800"></div>

          {/* Timeline */}
          <div className="flex flex-col w-64 px-2">
            <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase mb-1">
              <span>Timeline</span>
              <span className="font-mono text-zinc-200">
                {currentPoint?.time?.toLocaleTimeString()}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={viewData.points.length - 1}
              step={1}
              value={hoverIndex || 0}
              onChange={(e) => {
                const idx = parseInt(e.target.value);
                if (viewData.points[idx] && onSeek) {
                  onSeek(viewData.points[idx].time);
                }
              }}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500 hover:accent-rose-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// --- GŁÓWNA APLIKACJA ---

const SkiTrackerApp = () => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [rawPoints, setRawPoints] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSegmentIdx, setSelectedSegmentIdx] = useState(null);
  const [hoverIndex, setHoverIndex] = useState(null);

  // Ustawienia
  const [settings, setSettings] = useState({
    mode3D: true,
    smoothingWindow: 1,
    visualMode3D: false,
    detailLevel: 2000,
  });

  // Filtry
  const [filterType, setFilterType] = useState("descent");
  const [sortType, setSortType] = useState("time");
  const [sortDirection, setSortDirection] = useState("asc");

  // Przycinanie
  const [trimMode, setTrimMode] = useState(false);
  const [trimRange, setTrimRange] = useState(null);

  // Telemetria
  const [showTelemetry, setShowTelemetry] = useState(false);

  // Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [interpolatedPoint, setInterpolatedPoint] = useState(null);
  const lastFrameRef = useRef(0);
  const playbackTimeRef = useRef(0);

  const trackData = useMemo(() => {
    if (!rawPoints) return null;
    return analyzeTrack(rawPoints, settings);
  }, [rawPoints, settings.mode3D, settings.smoothingWindow]);

  const viewData = useMemo(() => {
    if (!trackData) return null;
    if (selectedSegmentIdx === null) return trackData;

    const segment = trackData.segments[selectedSegmentIdx];
    const segmentPoints = trackData.points.slice(
      segment.startIdx,
      segment.endIdx + 1,
    );

    return {
      points: segmentPoints,
      summary: {
        totalDistance: segment.distance,
        duration: segment.duration,
        avgSpeed: segment.avgSpeed,
        maxSpeed: segment.maxSpeed,
        elevationGain: segment.vertical,
        maxEle: Math.max(...segmentPoints.map((p) => p.ele)),
        minEle: Math.min(...segmentPoints.map((p) => p.ele)),
      },
      isSegment: true,
      segmentInfo: segment,
      segmentIndex: selectedSegmentIdx,
      segmentStartDist: segmentPoints[0].cumDist,
    };
  }, [trackData, selectedSegmentIdx]);

  const currentPoint = useMemo(() => {
    if (!viewData?.points?.length) return null;
    if (isPlaying && interpolatedPoint) return interpolatedPoint;
    if (hoverIndex !== null && viewData.points[hoverIndex])
      return viewData.points[hoverIndex];
    return viewData.points[0];
  }, [viewData, isPlaying, interpolatedPoint, hoverIndex]);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const processFile = (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith(".gpx")) {
      setError("Proszę wybrać plik z rozszerzeniem .gpx");
      return;
    }
    setFile(selectedFile);
    setLoading(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = parseGPXRaw(e.target.result);
        if (raw.length === 0) throw new Error("Nie znaleziono punktów trasy.");
        setRawPoints(raw);
        setSelectedSegmentIdx(null);
      } catch (err) {
        console.error(err);
        setError("Błąd parsowania pliku. Upewnij się, że to poprawny GPX.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0])
      processFile(e.dataTransfer.files[0]);
  };
  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  };
  const resetApp = () => {
    setFile(null);
    setRawPoints(null);
    setError(null);
    setSelectedSegmentIdx(null);
    setHoverIndex(null);
    setTrimMode(false);
    setTrimRange(null);
    setIsPlaying(false);
  };

  const initTrimMode = () => {
    setTrimMode(true);
    setTrimRange([0, rawPoints.length - 1]);
  };

  const applyTrim = () => {
    if (!rawPoints || !trimRange) return;
    const start = Math.min(trimRange[0], trimRange[1]);
    const end = Math.max(trimRange[0], trimRange[1]);
    const newRaw = rawPoints.slice(start, end + 1);
    setRawPoints(newRaw);
    setTrimMode(false);
    setTrimRange(null);
    setSelectedSegmentIdx(null);
  };

  const handleHover = (idx) => {
    if (isPlaying && idx !== null) {
      setIsPlaying(false);
    }
    setHoverIndex(idx);
  };

  useEffect(() => {
    if (!isPlaying || !viewData?.points?.length) {
      lastFrameRef.current = 0;
      return;
    }

    if (hoverIndex !== null) {
      const start = viewData.points[0].time.getTime();
      const current = viewData.points[hoverIndex].time.getTime();
      const derivedTime = current - start;

      // Only sync if significant drift (meaning context changed, e.g. hover vs seek)
      // This preserves the precise playbackTimeRef set by handleSeek
      if (Math.abs(playbackTimeRef.current - derivedTime) > 2000) {
        playbackTimeRef.current = derivedTime;
      }

      // Auto-restart if at the very end
      if (hoverIndex >= viewData.points.length - 1) {
        playbackTimeRef.current = 0;
      }
    } else {
      playbackTimeRef.current = 0;
    }

    let animId;
    const animate = (time) => {
      if (!lastFrameRef.current) lastFrameRef.current = time;
      const delta = time - lastFrameRef.current;
      lastFrameRef.current = time;

      playbackTimeRef.current += delta * playbackSpeed;

      const startT = viewData.points[0].time.getTime();
      const targetT = startT + playbackTimeRef.current;
      const endT = viewData.points[viewData.points.length - 1].time.getTime();

      if (targetT >= endT) {
        setHoverIndex(viewData.points.length - 1);
        setIsPlaying(false);
        return;
      }

      const nextIdx = viewData.points.findIndex(
        (p) => p.time.getTime() >= targetT,
      );
      if (nextIdx !== -1) {
        setHoverIndex(nextIdx);

        // Interpolacja
        if (nextIdx > 0) {
          const p2 = viewData.points[nextIdx];
          const p1 = viewData.points[nextIdx - 1];
          const t1 = p1.time.getTime();
          const t2 = p2.time.getTime();
          if (t2 > t1) {
            const r = (targetT - t1) / (t2 - t1);
            const lerp = (a, b) => a + (b - a) * r;

            setInterpolatedPoint({
              ...p1, // bazowe propsy
              time: new Date(targetT),
              lat: lerp(p1.lat, p2.lat),
              lon: lerp(p1.lon, p2.lon),
              ele: lerp(p1.ele, p2.ele),
              dist: lerp(p1.dist, p2.dist),
              cumDist: lerp(p1.cumDist, p2.cumDist),
              speed: lerp(p1.speed, p2.speed),
              smoothSpeed: lerp(
                p1.smoothSpeed || p1.speed,
                p2.smoothSpeed || p2.speed,
              ),
            });
          } else {
            setInterpolatedPoint(p2);
          }
        } else {
          setInterpolatedPoint(viewData.points[nextIdx]);
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, playbackSpeed, viewData]);

  const togglePlay = () => setIsPlaying((p) => !p);
  const toggleSpeed = () => {
    const speeds = [1, 2, 5, 10, 20, 50];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
  };

  const handleSeek = (newTime) => {
    const t = newTime.getTime();
    if (viewData?.points?.[0]) {
      playbackTimeRef.current = t - viewData.points[0].time.getTime();
    }
    lastFrameRef.current = performance.now(); // Reset delta tracking

    if (!viewData?.points) return;

    // Find nearest point and update state immediately
    const nextIdx = viewData.points.findIndex((p) => p.time.getTime() >= t);
    if (nextIdx !== -1) {
      setHoverIndex(nextIdx);
      setInterpolatedPoint(viewData.points[nextIdx]);
    }
  };

  const filteredSegments = useMemo(() => {
    if (!trackData) return [];

    let list = trackData.segments.map((seg, idx) => ({
      ...seg,
      originalIdx: idx,
    }));

    if (filterType !== "all") {
      list = list.filter((s) => s.type === filterType);
    }

    const multiplier = sortDirection === "asc" ? 1 : -1;

    list.sort((a, b) => {
      let valA, valB;
      if (sortType === "speed") {
        valA = a.maxSpeedVal;
        valB = b.maxSpeedVal;
      } else if (sortType === "distance") {
        valA = a.distanceVal;
        valB = b.distanceVal;
      } else if (sortType === "duration") {
        valA = a.durationVal;
        valB = b.durationVal;
      } else {
        // time
        valA = a.startTime.getTime();
        valB = b.startTime.getTime();
      }

      return (valA - valB) * multiplier;
    });

    return list;
  }, [trackData, filterType, sortType, sortDirection]);

  const handleSort = (type) => {
    if (sortType === type) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortType(type);
      if (type === "time") {
        setSortDirection("asc");
      } else {
        setSortDirection("desc");
      }
    }
  };

  return (
    <div className="min-h-screen font-sans bg-zinc-950 text-zinc-100 selection:bg-rose-500/30 pb-12">
      <nav className="h-16 border-b border-zinc-800/60 bg-zinc-950/70 backdrop-blur-xl sticky top-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-300 to-rose-400 flex items-center justify-center text-zinc-900 shadow-lg shadow-rose-500/20">
            <Mountain size={20} fill="currentColor" className="text-zinc-900" />
          </div>
          <span className="font-bold text-zinc-200 tracking-tight text-lg">
            Ski<span className="text-rose-400">Tracker</span> GPX
          </span>
        </div>
        {trackData && (
          <Button variant="secondary" size="xs" onClick={resetApp} icon={X}>
            Zamknij plik
          </Button>
        )}
      </nav>

      <main className="max-w-5xl mx-auto p-6 space-y-8">
        {!trackData && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in duration-700">
            <div className="text-center mb-8 space-y-2">
              <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-200 to-rose-300">
                Analizuj swoje zjazdy
              </h1>
              <p className="text-zinc-400">
                Przeciągnij plik GPX ze SkiTrackera lub innego urządzenia
              </p>
            </div>
            <div
              className={`relative w-full max-w-xl h-64 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all duration-300 ${dragActive ? "border-rose-400 bg-rose-500/5 scale-105 shadow-2xl shadow-rose-500/20" : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".gpx"
                onChange={handleChange}
              />
              <div className="flex flex-col items-center pointer-events-none">
                <div
                  className={`w-16 h-16 rounded-2xl mb-4 flex items-center justify-center transition-all duration-500 ${loading ? "animate-pulse bg-emerald-500/20" : "bg-zinc-800"}`}
                >
                  {loading ? (
                    <Activity className="text-emerald-400" />
                  ) : (
                    <UploadCloud className="text-zinc-400" size={32} />
                  )}
                </div>
                <p className="text-zinc-300 font-bold text-lg mb-1">
                  {loading ? "Przetwarzanie..." : "Upuść plik GPX tutaj"}
                </p>
                <p className="text-zinc-500 text-sm mb-6">
                  lub kliknij przycisk poniżej
                </p>
              </div>
              <label htmlFor="file-upload" className="cursor-pointer">
                <Button
                  variant="primary"
                  as="span"
                  className="pointer-events-auto"
                >
                  Wybierz plik
                </Button>
              </label>
            </div>
            {error && (
              <div className="mt-6 p-4 bg-rose-950/30 border border-rose-900/50 rounded-xl text-rose-300 flex items-center gap-3 animate-in slide-in-from-bottom-2">
                <X size={18} />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}
          </div>
        )}

        {viewData && (
          <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                {viewData.isSegment ? (
                  <>
                    <Button
                      variant="secondary"
                      size="xs"
                      icon={ArrowLeft}
                      onClick={() => setSelectedSegmentIdx(null)}
                    >
                      Wróć
                    </Button>
                    <div>
                      <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
                        {viewData.segmentInfo.type === "descent"
                          ? "Szczegóły Zjazdu"
                          : "Szczegóły Wjazdu"}{" "}
                        #{viewData.segmentInfo.typeIndex}
                      </h2>
                      <div className="text-xs font-mono text-zinc-500 mt-1 flex items-center gap-2">
                        <span>
                          {viewData.segmentInfo.startTime.toLocaleTimeString()}{" "}
                          - {viewData.segmentInfo.endTime.toLocaleTimeString()}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                        <span>{viewData.points.length} pkt GPX</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
                      <FileCode className="text-rose-400" size={24} />
                      {file.name}
                    </h2>
                    {!trimMode && (
                      <div className="flex items-center gap-3 mt-1.5 text-xs font-mono text-zinc-500">
                        <span>{trackData.summary.pointsCount} punktów</span>
                        <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                        <span>Zjazdy: {trackData.summary.runsCount}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {viewData.isSegment && (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    icon={Monitor}
                    onClick={() => setShowTelemetry(true)}
                  >
                    Telemetria
                  </Button>
                </div>
              )}

              {!viewData.isSegment && (
                <div className="flex gap-2">
                  {trimMode ? (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setTrimMode(false);
                          setTrimRange(null);
                        }}
                      >
                        Anuluj
                      </Button>
                      <Button variant="primary" icon={Save} onClick={applyTrim}>
                        Zastosuj
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      icon={Scissors}
                      onClick={initTrimMode}
                    >
                      Przytnij GPX
                    </Button>
                  )}
                </div>
              )}
            </div>

            {trimMode && trimRange && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center animate-in fade-in">
                <p className="text-sm text-rose-200 mb-2 font-bold">
                  Tryb Edycji: Przesuwaj suwaki na wykresie wysokości, aby
                  przyciąć trasę.
                </p>
                <div className="flex justify-center gap-8 font-mono text-xs text-rose-300">
                  <span>
                    Start:{" "}
                    {viewData.points[trimRange[0]].time.toLocaleTimeString()}
                  </span>
                  <span>
                    Koniec:{" "}
                    {viewData.points[trimRange[1]].time.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="hover:border-rose-500/30 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-300">
                    <Navigation size={20} />
                  </div>

                  <div className="flex items-center gap-1 bg-zinc-950/50 rounded-lg p-0.5 border border-zinc-800">
                    <button
                      onClick={() =>
                        setSettings((s) => ({ ...s, mode3D: false }))
                      }
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${!settings.mode3D ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      2D
                    </button>
                    <button
                      onClick={() =>
                        setSettings((s) => ({ ...s, mode3D: true }))
                      }
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${settings.mode3D ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}
                    >
                      3D
                    </button>
                  </div>
                </div>
                <div className="text-3xl font-bold text-zinc-100 tracking-tight">
                  {viewData.summary.totalDistance}{" "}
                  <span className="text-base font-normal text-zinc-500">
                    km
                  </span>
                </div>
                <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-bold">
                  Dystans
                </div>
              </Card>

              <Card className="hover:border-rose-500/30 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-300">
                    <Clock size={20} />
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={toggleSpeed}
                      className="px-2 py-1 rounded-lg bg-zinc-800/50 border border-zinc-700/50 text-xs font-mono text-zinc-300 hover:bg-zinc-700 transition-colors min-w-[36px]"
                      title="Prędkość odtwarzania"
                    >
                      x{playbackSpeed}
                    </button>
                    <button
                      onClick={togglePlay}
                      className={`p-1.5 rounded-lg border transition-all ${
                        isPlaying
                          ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                          : "bg-zinc-800/50 border-zinc-700/50 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700"
                      }`}
                    >
                      {isPlaying ? (
                        <Pause size={14} fill="currentColor" />
                      ) : (
                        <Play size={14} fill="currentColor" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="text-3xl font-bold text-zinc-100 tracking-tight">
                  {viewData.summary.duration}
                </div>
                <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-bold">
                  Czas trwania
                </div>
              </Card>

              <Card className="hover:border-rose-500/30 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-300">
                    <Zap size={20} />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="primary">
                      Max {viewData.summary.maxSpeed}
                    </Badge>
                    <div
                      className="flex items-center gap-1.5"
                      title="Wygładzanie GPS"
                    >
                      <Sliders size={10} className="text-zinc-600" />
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={settings.smoothingWindow}
                        onChange={(e) =>
                          setSettings((s) => ({
                            ...s,
                            smoothingWindow: parseInt(e.target.value),
                          }))
                        }
                        className="h-1 w-12 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                      />
                      <span className="text-[9px] font-mono text-zinc-500 w-3 text-center">
                        {settings.smoothingWindow}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-3xl font-bold text-zinc-100 tracking-tight">
                  {viewData.summary.avgSpeed}{" "}
                  <span className="text-base font-normal text-zinc-500">
                    km/h
                  </span>
                </div>

                <div className="flex justify-between items-end mt-1">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider font-bold">
                    Średnia Prędkość
                  </div>
                </div>
              </Card>
              <Card className="hover:border-rose-500/30 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-300">
                    <Mountain size={20} />
                  </div>
                  <Badge variant="neutral">
                    Max {viewData.summary.maxEle}m
                  </Badge>
                </div>
                <div className="text-3xl font-bold text-zinc-100 tracking-tight">
                  {viewData.summary.elevationGain}{" "}
                  <span className="text-base font-normal text-zinc-500">m</span>
                </div>
                <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-bold">
                  Przewyższenie
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
              <div className="lg:col-span-2 space-y-6">
                <Card title="Profil Wysokościowy">
                  <div className="mt-4">
                    <ElevationChart
                      points={viewData.points}
                      height={64}
                      hoverIndex={hoverIndex}
                      onHover={handleHover}
                      trimRange={trimMode ? trimRange : null}
                      onTrimChange={setTrimRange}
                    />
                  </div>
                </Card>

                {viewData.isSegment && (
                  <Card
                    title="Profil Prędkości"
                    action={
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase flex items-center gap-1">
                          <Sliders size={10} /> Wygładzanie
                        </span>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="1"
                          value={settings.smoothingWindow}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              smoothingWindow: parseInt(e.target.value),
                            }))
                          }
                          className="h-1 w-16 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                        />
                        <span className="text-[10px] font-mono text-zinc-400 w-4 text-center">
                          {settings.smoothingWindow}
                        </span>
                      </div>
                    }
                  >
                    <div className="mt-4">
                      <SpeedChart
                        points={viewData.points}
                        height={48}
                        hoverIndex={hoverIndex}
                        onHover={handleHover}
                        trimRange={trimMode ? trimRange : null}
                      />
                      <div className="text-xs text-zinc-500 mt-2 text-center">
                        Prędkość (km/h) w funkcji dystansu
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              <div className="flex flex-col gap-6">
                <Card
                  title={viewData.isSegment ? "Ślad Segmentu" : "Kształt Trasy"}
                  action={
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          setSettings((s) => ({
                            ...s,
                            visualMode3D: !s.visualMode3D,
                          }))
                        }
                        className="focus:outline-none"
                      >
                        <Badge
                          variant={
                            settings.visualMode3D ? "primary" : "neutral"
                          }
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          {settings.visualMode3D ? "3D" : "2D"}
                        </Badge>
                      </button>
                    </div>
                  }
                >
                  <div className="flex flex-col items-center justify-center gap-4">
                    <RoutePreview
                      points={viewData.points}
                      mode3D={settings.visualMode3D}
                      detailLevel={settings.detailLevel}
                      hoverIndex={hoverIndex}
                      cursorPoint={currentPoint}
                      onHover={handleHover}
                    />

                    {settings.visualMode3D && (
                      <div className="w-full pt-2 border-t border-zinc-800/50 animate-in fade-in slide-in-from-top-1">
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-2">
                          <span className="flex items-center gap-1">
                            <Cpu size={10} /> Detale 3D (Max pkt)
                          </span>
                          <span className="font-mono">
                            {settings.detailLevel} pts
                          </span>
                        </div>
                        <input
                          type="range"
                          min="2000"
                          max="20000"
                          step="1000"
                          value={settings.detailLevel}
                          onChange={(e) =>
                            setSettings((s) => ({
                              ...s,
                              detailLevel: parseInt(e.target.value),
                            }))
                          }
                          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-[10px] text-zinc-500">
                      {settings.visualMode3D && (
                        <span className="flex items-center gap-1">
                          <Box size={10} /> Widok izometryczny
                        </span>
                      )}
                    </div>
                  </div>
                </Card>

                <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 shadow-lg backdrop-blur-md">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Crosshair size={14} /> Dane Punktu
                  </h3>

                  {hoverIndex !== null ? (
                    <div className="space-y-4">
                      {!viewData.isSegment &&
                        (() => {
                          const activeSeg = trackData.segments.find(
                            (s) =>
                              hoverIndex >= s.startIdx &&
                              hoverIndex <= s.endIdx,
                          );
                          if (activeSeg) {
                            return (
                              <div className="pb-3 mb-1 border-b border-zinc-700/50 flex items-center justify-between">
                                <span className="text-xs text-zinc-500">
                                  Aktywność:
                                </span>
                                <span
                                  className={`font-bold ${activeSeg.type === "descent" ? "text-rose-400" : "text-emerald-400"}`}
                                >
                                  {activeSeg.type === "descent"
                                    ? "Zjazd"
                                    : "Wjazd"}{" "}
                                  #{activeSeg.typeIndex}
                                </span>
                              </div>
                            );
                          }
                          return (
                            <div className="pb-3 mb-1 border-b border-zinc-700/50 flex items-center justify-between">
                              <span className="text-xs text-zinc-500">
                                Status:
                              </span>
                              <span className="text-zinc-400">
                                Oczekiwanie / Transfer
                              </span>
                            </div>
                          );
                        })()}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-[10px] text-zinc-500">Czas</div>
                          <div className="text-lg font-mono text-zinc-200">
                            {viewData.points[
                              hoverIndex
                            ].time.toLocaleTimeString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-500">
                            Dystans
                          </div>
                          <div className="text-lg font-mono text-zinc-200">
                            {viewData.isSegment
                              ? (
                                  (viewData.points[hoverIndex].cumDist -
                                    viewData.segmentStartDist) /
                                  1000
                                ).toFixed(2)
                              : (
                                  viewData.points[hoverIndex].cumDist / 1000
                                ).toFixed(2)}{" "}
                            <span className="text-sm text-zinc-500">km</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-500">
                            Wysokość
                          </div>
                          <div className="text-lg font-mono text-orange-300">
                            {Math.round(viewData.points[hoverIndex].ele)}{" "}
                            <span className="text-sm text-orange-300/50">
                              m
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-500">
                            Prędkość
                          </div>
                          <div className="text-lg font-mono text-emerald-300">
                            {(
                              viewData.points[hoverIndex].smoothSpeed ||
                              viewData.points[hoverIndex].speed ||
                              0
                            ).toFixed(1)}{" "}
                            <span className="text-sm text-emerald-300/50">
                              km/h
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 flex flex-col items-center justify-center text-zinc-600 text-sm">
                      <MousePointerClick
                        size={24}
                        className="mb-2 opacity-50"
                      />
                      Wskaż punkt na wykresie lub mapie
                    </div>
                  )}
                </div>
              </div>
            </div>

            {!viewData.isSegment && !trimMode && (
              <div className="space-y-4 animate-in fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1">
                      <Filter size={12} /> Pokaż
                    </span>
                    <div className="flex bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                      <button
                        onClick={() => setFilterType("all")}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${filterType === "all" ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}
                      >
                        Wszystkie
                      </button>
                      <button
                        onClick={() => setFilterType("descent")}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${filterType === "descent" ? "bg-rose-500/20 text-rose-300" : "text-zinc-500 hover:text-zinc-300"}`}
                      >
                        Zjazdy
                      </button>
                      <button
                        onClick={() => setFilterType("ascent")}
                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${filterType === "ascent" ? "bg-emerald-500/20 text-emerald-300" : "text-zinc-500 hover:text-zinc-300"}`}
                      >
                        Wjazdy
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1">
                      <ArrowUpDown size={12} /> Sortuj
                    </span>
                    <div className="flex flex-wrap bg-zinc-950 rounded-lg p-1 border border-zinc-800">
                      <button
                        onClick={() => handleSort("time")}
                        className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold transition-all ${sortType === "time" ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}
                      >
                        Chronologicznie{" "}
                        {sortType === "time" &&
                          (sortDirection === "asc" ? (
                            <ArrowUp size={12} />
                          ) : (
                            <ArrowDown size={12} />
                          ))}
                      </button>
                      <button
                        onClick={() => handleSort("duration")}
                        className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold transition-all ${sortType === "duration" ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}
                      >
                        Czas trwania{" "}
                        {sortType === "duration" &&
                          (sortDirection === "asc" ? (
                            <ArrowUp size={12} />
                          ) : (
                            <ArrowDown size={12} />
                          ))}
                      </button>
                      <button
                        onClick={() => handleSort("distance")}
                        className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold transition-all ${sortType === "distance" ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}
                      >
                        Dystans{" "}
                        {sortType === "distance" &&
                          (sortDirection === "asc" ? (
                            <ArrowUp size={12} />
                          ) : (
                            <ArrowDown size={12} />
                          ))}
                      </button>
                      <button
                        onClick={() => handleSort("speed")}
                        className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-bold transition-all ${sortType === "speed" ? "bg-zinc-800 text-zinc-200" : "text-zinc-500 hover:text-zinc-300"}`}
                      >
                        V-Max{" "}
                        {sortType === "speed" &&
                          (sortDirection === "asc" ? (
                            <ArrowUp size={12} />
                          ) : (
                            <ArrowDown size={12} />
                          ))}
                      </button>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-zinc-200">
                  Wykryte Aktywności ({filteredSegments.length})
                </h3>

                <div className="grid gap-3">
                  {filteredSegments.map((seg) => (
                    <div
                      key={seg.originalIdx}
                      onClick={() => setSelectedSegmentIdx(seg.originalIdx)}
                      className="cursor-pointer flex items-center justify-between p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-xl hover:bg-zinc-800 hover:border-zinc-600 transition-all group active:scale-[0.99]"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                            seg.type === "descent"
                              ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {seg.type === "descent" ? (
                            <ArrowDownRight size={20} />
                          ) : (
                            <ArrowUpRight size={20} />
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-zinc-200 flex items-center gap-2 group-hover:text-rose-300 transition-colors">
                            {seg.type === "descent" ? "Zjazd" : "Wjazd/Wyciąg"}{" "}
                            #{seg.typeIndex}
                            {seg.type === "descent" && (
                              <Badge variant="primary">
                                Max {seg.maxSpeed} km/h
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono mt-0.5">
                            {seg.startTime.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 md:gap-8">
                        <div className="text-right">
                          <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">
                            Czas
                          </div>
                          <div className="font-mono text-zinc-300">
                            {seg.duration}
                          </div>
                        </div>
                        <div className="text-right w-20 hidden sm:block">
                          <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">
                            Dystans
                          </div>
                          <div className="font-mono text-zinc-300">
                            {seg.distance} km
                          </div>
                        </div>
                        <div className="text-right w-20">
                          <div className="text-xs text-zinc-500 uppercase font-bold tracking-wider">
                            Pion
                          </div>
                          <div
                            className={`font-mono font-bold ${seg.type === "descent" ? "text-rose-400" : "text-emerald-400"}`}
                          >
                            {seg.vertical}m
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredSegments.length === 0 && (
                    <div className="text-center py-8 text-zinc-500">
                      Brak aktywności spełniających kryteria.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {showTelemetry && viewData && (
          <TelemetryView
            viewData={viewData}
            currentPoint={
              isPlaying && interpolatedPoint
                ? interpolatedPoint
                : hoverIndex !== null
                  ? viewData.points[hoverIndex]
                  : viewData.points[0]
            }
            hoverIndex={hoverIndex}
            isPlaying={isPlaying}
            onClose={() => setShowTelemetry(false)}
            togglePlay={togglePlay}
            toggleSpeed={toggleSpeed}
            playbackSpeed={playbackSpeed}
            settings={settings}
            setSettings={setSettings}
            onSeek={handleSeek}
          />
        )}
      </main>
    </div>
  );
};

export default SkiTrackerApp;
