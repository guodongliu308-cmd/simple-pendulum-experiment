import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Activity,
  Sparkles,
  Compass,
  Gauge,
  Timer,
  Zap,
  Wind,
  CheckCircle2,
  HelpCircle,
  Maximize2
} from 'lucide-react';
import type { CelestialEnvironment } from '../types';

const CELESTIAL_ENVIRONMENTS: CelestialEnvironment[] = [
  {
    id: 'earth',
    name: '地球 (Earth)',
    shortName: '地球',
    g: 9.8,
    icon: '🌍',
    description: '标准重力加速度 g = 9.80 m/s²',
  },
  {
    id: 'moon',
    name: '月球 (Moon)',
    shortName: '月球',
    g: 1.62,
    icon: '🌙',
    description: '重力约为地球的 1/6，单摆摆动显著变缓',
  },
  {
    id: 'mars',
    name: '火星 (Mars)',
    shortName: '火星',
    g: 3.72,
    icon: '🔴',
    description: '重力约为地球的 38%，中等周期',
  },
  {
    id: 'jupiter',
    name: '木星 (Jupiter)',
    shortName: '木星',
    g: 24.79,
    icon: '🪐',
    description: '重力为地球的 2.5 倍，单摆摆动极其急促快速',
  },
  {
    id: 'space',
    name: '空间站微重力 (Space)',
    shortName: '微重力',
    g: 0.2,
    icon: '🛰️',
    description: '接近失重环境，恢复力微弱，周期极长',
  },
];

export const PendulumExperiment: React.FC = () => {
  // Physical parameters
  const [lengthMeters, setLengthMeters] = useState<number>(1.2); // 0.4m ~ 2.4m
  const [massKg, setMassKg] = useState<number>(1.0); // 0.2kg ~ 2.5kg
  const [initialAngleDeg, setInitialAngleDeg] = useState<number>(30); // 5° ~ 75°
  const [envId, setEnvId] = useState<string>('earth');
  const [customG, setCustomG] = useState<number>(9.8);
  const [isCustomG, setIsCustomG] = useState<boolean>(false);

  // Simulation controls
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0); // 0.25, 0.5, 1.0, 2.0
  const [enableDamping, setEnableDamping] = useState<boolean>(false); // Air resistance / damping

  // Visual toggles
  const [showVelocityVector, setShowVelocityVector] = useState<boolean>(true);
  const [showForceVector, setShowForceVector] = useState<boolean>(true);
  const [showTrajectory, setShowTrajectory] = useState<boolean>(true);
  const [showProtractor, setShowProtractor] = useState<boolean>(true);

  // Active gravity
  const currentEnv = CELESTIAL_ENVIRONMENTS.find(e => e.id === envId) || CELESTIAL_ENVIRONMENTS[0];
  const g = isCustomG ? customG : currentEnv.g;

  // Theoretical Period: Small angle approximation T = 2 * pi * sqrt(L / g)
  // Higher accuracy correction: T ≈ 2*pi*sqrt(L/g) * (1 + 1/16 * theta0^2)
  const theta0Rad = (initialAngleDeg * Math.PI) / 180;
  const theoreticalPeriodSmall = 2 * Math.PI * Math.sqrt(Math.max(0.01, lengthMeters / g));
  const theoreticalPeriodCorrected = theoreticalPeriodSmall * (1 + (1 / 16) * theta0Rad * theta0Rad);

  // Dynamic simulation state
  const [angle, setAngle] = useState<number>(theta0Rad);
  const [omega, setOmega] = useState<number>(0);
  const [cycleCount, setCycleCount] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Stopwatch measurement
  const [isTimingActive, setIsTimingActive] = useState<boolean>(false);
  const [timedCycles, setTimedCycles] = useState<number>(0);
  const [timedDuration, setTimedDuration] = useState<number>(0);

  // Dragging state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Simulation physics ref
  const simRef = useRef({
    theta: theta0Rad,
    omega: 0,
    time: 0,
    cycleCount: 0,
    lastCrossTheta: theta0Rad,
    timedCycles: 0,
    timedDuration: 0,
    isTiming: false,
  });

  // Keep simRef in sync when parameters or reset occur
  const resetSimulation = useCallback(() => {
    const startRad = (initialAngleDeg * Math.PI) / 180;
    simRef.current.theta = startRad;
    simRef.current.omega = 0;
    simRef.current.time = 0;
    simRef.current.cycleCount = 0;
    simRef.current.lastCrossTheta = startRad;
    simRef.current.timedCycles = 0;
    simRef.current.timedDuration = 0;

    setAngle(startRad);
    setOmega(0);
    setCycleCount(0);
    setElapsedTime(0);
    setTimedCycles(0);
    setTimedDuration(0);
  }, [initialAngleDeg]);

  useEffect(() => {
    resetSimulation();
  }, [lengthMeters, initialAngleDeg, envId, isCustomG, customG, resetSimulation]);

  // Main physics animation loop
  useEffect(() => {
    if (!isPlaying || isDragging) return;

    let animId: number;
    let lastTimestamp = performance.now();

    const loop = (timestamp: number) => {
      const wallDt = Math.min((timestamp - lastTimestamp) / 1000, 0.05);
      lastTimestamp = timestamp;

      // Apply playback speed
      const dt = wallDt * playbackSpeed;

      // Sub-stepping for ultra-smooth symplectic numerical integration
      const subSteps = 4;
      const subDt = dt / subSteps;

      for (let i = 0; i < subSteps; i++) {
        // Natural air damping if toggled on
        const dampingCoeff = enableDamping ? 0.05 : 0;
        
        // Exact non-linear pendulum differential equation:
        // d^2(theta)/dt^2 = -(g / L) * sin(theta) - damping * omega
        const alpha = -(g / lengthMeters) * Math.sin(simRef.current.theta) - dampingCoeff * simRef.current.omega;

        const prevTheta = simRef.current.theta;
        simRef.current.omega += alpha * subDt;
        simRef.current.theta += simRef.current.omega * subDt;

        // Zero-crossing check for complete period counting (from negative to positive with omega > 0)
        if (prevTheta < 0 && simRef.current.theta >= 0 && simRef.current.omega > 0) {
          simRef.current.cycleCount += 1;
          if (simRef.current.isTiming) {
            simRef.current.timedCycles += 1;
          }
        }
      }

      simRef.current.time += dt;
      if (simRef.current.isTiming) {
        simRef.current.timedDuration += dt;
      }

      setAngle(simRef.current.theta);
      setOmega(simRef.current.omega);
      setCycleCount(simRef.current.cycleCount);
      setElapsedTime(simRef.current.time);
      setTimedCycles(simRef.current.timedCycles);
      setTimedDuration(simRef.current.timedDuration);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isDragging, playbackSpeed, g, lengthMeters, enableDamping]);

  // Single step forward
  const stepForward = () => {
    const dt = 0.03;
    const dampingCoeff = enableDamping ? 0.05 : 0;
    const alpha = -(g / lengthMeters) * Math.sin(simRef.current.theta) - dampingCoeff * simRef.current.omega;
    simRef.current.omega += alpha * dt;
    simRef.current.theta += simRef.current.omega * dt;
    simRef.current.time += dt;
    setAngle(simRef.current.theta);
    setOmega(simRef.current.omega);
    setElapsedTime(simRef.current.time);
  };

  // Stopwatch controls
  const handleToggleTiming = () => {
    if (isTimingActive) {
      setIsTimingActive(false);
      simRef.current.isTiming = false;
    } else {
      setIsTimingActive(true);
      simRef.current.isTiming = true;
      simRef.current.timedCycles = 0;
      simRef.current.timedDuration = 0;
      setTimedCycles(0);
      setTimedDuration(0);
    }
  };

  const handleResetTiming = () => {
    setIsTimingActive(false);
    simRef.current.isTiming = false;
    simRef.current.timedCycles = 0;
    simRef.current.timedDuration = 0;
    setTimedCycles(0);
    setTimedDuration(0);
  };

  // SVG Geometry calculations
  const width = 640;
  const height = 440;
  const pivotX = width / 2;
  const pivotY = 55;

  // Scale length: 1 meter = 125 pixels
  const pxPerMeter = 125;
  const visualLength = lengthMeters * pxPerMeter;

  const bobX = pivotX + visualLength * Math.sin(angle);
  const bobY = pivotY + visualLength * Math.cos(angle);

  // Height relative to lowest equilibrium point: h = L * (1 - cos(theta))
  const currentHeightMeters = Math.max(0, lengthMeters * (1 - Math.cos(angle)));
  const maxThetaRad = (initialAngleDeg * Math.PI) / 180;
  const maxHeightMeters = lengthMeters * (1 - Math.cos(maxThetaRad));

  // Current linear velocity v = L * omega
  const linearVelocity = lengthMeters * omega;

  // Kinetic energy: Ek = 1/2 * m * v^2
  const ek = 0.5 * massKg * linearVelocity * linearVelocity;

  // Potential energy: Ep = m * g * h
  const ep = massKg * g * currentHeightMeters;

  // Total mechanical energy
  const totalEnergy = ek + ep;
  const theoreticalMaxEnergy = massKg * g * maxHeightMeters;
  const maxRefEnergy = Math.max(0.001, Math.max(totalEnergy, theoreticalMaxEnergy));

  const ekPercent = Math.min(100, Math.max(0, (ek / maxRefEnergy) * 100));
  const epPercent = Math.min(100, Math.max(0, (ep / maxRefEnergy) * 100));

  // Tangential restoring force F_t = -m * g * sin(theta)
  const restoringForce = -massKg * g * Math.sin(angle);

  // Radius of bob based on mass
  const bobRadius = 14 + (massKg / 2.5) * 10;

  // Dragging event handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setIsPlaying(false);
    updateAngleFromPointer(e);
  };

  const updateAngleFromPointer = (e: React.PointerEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    // Scale client coords to SVG viewbox
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    const dx = mouseX - pivotX;
    const dy = mouseY - pivotY;

    // Angle theta from downward vertical (clockwise positive)
    let newAngle = Math.atan2(dx, Math.max(10, dy));
    // Limit angle to ±75°
    const maxRad = (75 * Math.PI) / 180;
    newAngle = Math.max(-maxRad, Math.min(maxRad, newAngle));

    simRef.current.theta = newAngle;
    simRef.current.omega = 0;
    setAngle(newAngle);
    setOmega(0);
    const newDeg = Math.round(Math.abs((newAngle * 180) / Math.PI));
    if (newDeg >= 5 && newDeg <= 75) {
      setInitialAngleDeg(newDeg);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    updateAngleFromPointer(e);
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setIsPlaying(true);
    }
  };

  // Measured period average
  const measuredPeriod = timedCycles > 0 ? timedDuration / timedCycles : 0;

  return (
    <div id="pendulum-interactive-tool" className="flex flex-col gap-6">
      {/* Top Banner Overview */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-700">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              单摆与机械能守恒 · 仿真探究实验室
            </h2>
            <p className="text-xs text-slate-500">
              可触控拖拽摆球 · 实时动能/势能分析 · 伽利略等时性验证 · 多天体引力场
            </p>
          </div>
        </div>

        {/* Quick Theory Pill */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-700 flex items-center gap-2">
            <span className="text-slate-400 font-medium">理论周期公式:</span>
            <code className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-bold text-indigo-600">
              T = 2π√(L/g)
            </code>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-700 flex items-center gap-2">
            <span className="text-slate-400 font-medium">机械能守恒:</span>
            <code className="bg-white border border-slate-200 px-1.5 py-0.5 rounded font-bold text-emerald-600">
              E = ½mv² + mgh
            </code>
          </div>
        </div>
      </div>

      {/* Main Interactive Stage & Sidebar */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left Interactive Stage & Real-time Visualizer */}
        <div className="flex-1 w-full bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col items-center">
          {/* Controls Bar above Stage */}
          <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <button
                id="pendulum-play-toggle-btn"
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs ${
                  isPlaying
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? '暂停' : '开始运动'}</span>
              </button>

              <button
                id="pendulum-step-btn"
                onClick={stepForward}
                disabled={isPlaying}
                className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                title="单帧微调步进（暂停时可用）"
              >
                单步进
              </button>

              <button
                id="pendulum-reset-stage-btn"
                onClick={resetSimulation}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                title="重置到初始摆角"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>初始位置</span>
              </button>
            </div>

            {/* Playback Speed Multiplier */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <span className="text-[11px] text-slate-500 px-1.5">速度:</span>
              {[0.25, 0.5, 1.0, 2.0].map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-all cursor-pointer ${
                    playbackSpeed === speed
                      ? 'bg-white text-indigo-600 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Canvas SVG Simulation Screen */}
          <div className="relative w-full max-w-[640px] aspect-[16/11] bg-slate-950 rounded-xl overflow-hidden shadow-inner border border-slate-800 flex items-center justify-center select-none touch-none">
            <svg
              ref={svgRef}
              className="w-full h-full cursor-crosshair"
              viewBox={`0 0 ${width} ${height}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {/* Grid Background Pattern */}
              <defs>
                <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>
                {/* Metallic Bob Radial Gradient */}
                <radialGradient id="bobShader" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#93c5fd" />
                  <stop offset="45%" stopColor="#3b82f6" />
                  <stop offset="90%" stopColor="#1e3a8a" />
                  <stop offset="100%" stopColor="#0f172a" />
                </radialGradient>
                {/* Velocity Arrow Head */}
                <marker
                  id="velArrow"
                  markerWidth="7"
                  markerHeight="5"
                  refX="6"
                  refY="2.5"
                  orient="auto"
                >
                  <polygon points="0 0, 7 2.5, 0 5" fill="#22c55e" />
                </marker>
                {/* Restoring Force Arrow Head */}
                <marker
                  id="forceArrow"
                  markerWidth="7"
                  markerHeight="5"
                  refX="6"
                  refY="2.5"
                  orient="auto"
                >
                  <polygon points="0 0, 7 2.5, 0 5" fill="#ef4444" />
                </marker>
              </defs>

              {/* Background Grid */}
              <rect width={width} height={height} fill="url(#gridPattern)" />

              {/* Ceiling Support Bracket */}
              <rect x={pivotX - 60} y="15" width="120" height="12" fill="#334155" rx="3" />
              <line x1={pivotX - 50} y1="27" x2={pivotX - 40} y2="15" stroke="#64748b" strokeWidth="2" />
              <line x1={pivotX - 30} y1="27" x2={pivotX - 20} y2="15" stroke="#64748b" strokeWidth="2" />
              <line x1={pivotX - 10} y1="27" x2={pivotX} y2="15" stroke="#64748b" strokeWidth="2" />
              <line x1={pivotX + 10} y1="27" x2={pivotX + 20} y2="15" stroke="#64748b" strokeWidth="2" />
              <line x1={pivotX + 30} y1="27" x2={pivotX + 40} y2="15" stroke="#64748b" strokeWidth="2" />

              {/* Semi-transparent Protractor / Angle Scale */}
              {showProtractor && (
                <g opacity="0.35">
                  <path
                    d={`M ${pivotX - 70} ${pivotY} A 70 70 0 0 0 ${pivotX + 70} ${pivotY}`}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                  />
                  {[-60, -45, -30, -15, 0, 15, 30, 45, 60].map(deg => {
                    const r1 = 65;
                    const r2 = 75;
                    const rad = (deg * Math.PI) / 180;
                    const x1 = pivotX + r1 * Math.sin(rad);
                    const y1 = pivotY + r1 * Math.cos(rad);
                    const x2 = pivotX + r2 * Math.sin(rad);
                    const y2 = pivotY + r2 * Math.cos(rad);
                    return (
                      <g key={deg}>
                        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#94a3b8" strokeWidth="1" />
                        <text
                          x={pivotX + 88 * Math.sin(rad)}
                          y={pivotY + 88 * Math.cos(rad) + 3}
                          fill="#94a3b8"
                          fontSize="9"
                          textAnchor="middle"
                        >
                          {Math.abs(deg)}°
                        </text>
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Vertical Equilibrium Baseline */}
              <line
                x1={pivotX}
                y1={pivotY}
                x2={pivotX}
                y2={pivotY + visualLength + 35}
                stroke="#475569"
                strokeWidth="1.5"
                strokeDasharray="4,4"
              />
              <text x={pivotX + 6} y={pivotY + visualLength + 30} fill="#64748b" fontSize="10">
                平衡位置 (h=0)
              </text>

              {/* Lowest Height Datum Reference Line */}
              <line
                x1={pivotX - visualLength - 20}
                y1={pivotY + visualLength}
                x2={pivotX + visualLength + 20}
                y2={pivotY + visualLength}
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="3,3"
              />

              {/* Maximum Height Reference Horizontal Line */}
              {maxHeightMeters > 0.005 && (
                <g opacity="0.6">
                  <line
                    x1={pivotX - visualLength * Math.sin(maxThetaRad) - 10}
                    y1={pivotY + visualLength * Math.cos(maxThetaRad)}
                    x2={pivotX + visualLength * Math.sin(maxThetaRad) + 10}
                    y2={pivotY + visualLength * Math.cos(maxThetaRad)}
                    stroke="#f59e0b"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                  <text
                    x={pivotX + visualLength * Math.sin(maxThetaRad) + 14}
                    y={pivotY + visualLength * Math.cos(maxThetaRad) + 3}
                    fill="#f59e0b"
                    fontSize="10"
                  >
                    h_max = {maxHeightMeters.toFixed(3)}m
                  </text>
                </g>
              )}

              {/* Swing Trajectory Arc */}
              {showTrajectory && (
                <path
                  d={`M ${pivotX - visualLength * Math.sin(maxThetaRad)} ${
                    pivotY + visualLength * Math.cos(maxThetaRad)
                  } A ${visualLength} ${visualLength} 0 0 0 ${
                    pivotX + visualLength * Math.sin(maxThetaRad)
                  } ${pivotY + visualLength * Math.cos(maxThetaRad)}`}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  strokeDasharray="3,3"
                  opacity="0.45"
                />
              )}

              {/* Height Indicator for Current Bob Position */}
              {currentHeightMeters > 0.005 && (
                <line
                  x1={bobX}
                  y1={bobY}
                  x2={bobX}
                  y2={pivotY + visualLength}
                  stroke="#60a5fa"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                  opacity="0.6"
                />
              )}

              {/* Pendulum Suspension String */}
              <line
                x1={pivotX}
                y1={pivotY}
                x2={bobX}
                y2={bobY}
                stroke="#e2e8f0"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Velocity Vector Arrow (Tangential) */}
              {showVelocityVector && Math.abs(linearVelocity) > 0.04 && (
                <g transform={`translate(${bobX}, ${bobY})`}>
                  <line
                    x1="0"
                    y1="0"
                    x2={linearVelocity * 38 * Math.cos(angle)}
                    y2={-linearVelocity * 38 * Math.sin(angle)}
                    stroke="#22c55e"
                    strokeWidth="3"
                    strokeLinecap="round"
                    markerEnd="url(#velArrow)"
                  />
                </g>
              )}

              {/* Restoring Force Vector Arrow (Tangential) */}
              {showForceVector && Math.abs(restoringForce) > 0.05 && (
                <g transform={`translate(${bobX}, ${bobY})`}>
                  <line
                    x1="0"
                    y1="0"
                    x2={restoringForce * 12 * Math.cos(angle)}
                    y2={-restoringForce * 12 * Math.sin(angle)}
                    stroke="#ef4444"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    markerEnd="url(#forceArrow)"
                  />
                </g>
              )}

              {/* Pendulum Bob (Heavy Sphere) */}
              <circle
                cx={bobX}
                cy={bobY}
                r={bobRadius}
                fill="url(#bobShader)"
                stroke="#f8fafc"
                strokeWidth="2"
                className="transition-transform"
                filter="drop-shadow(0 4px 10px rgba(0,0,0,0.6))"
              />

              {/* Center Pivot Point */}
              <circle cx={pivotX} cy={pivotY} r="6" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />

              {/* Drag Hint on Bob */}
              {isDragging && (
                <circle
                  cx={bobX}
                  cy={bobY}
                  r={bobRadius + 6}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                />
              )}

              {/* Canvas Overlay Telemetry Info */}
              <g transform="translate(18, 30)">
                <rect x="0" y="0" width="165" height="92" rx="8" fill="#0f172a" fillOpacity="0.8" stroke="#334155" strokeWidth="1" />
                <text x="12" y="20" fill="#94a3b8" fontSize="11">
                  摆长 L = <tspan fill="#f1f5f9" fontWeight="bold">{lengthMeters.toFixed(2)} m</tspan>
                </text>
                <text x="12" y="38" fill="#94a3b8" fontSize="11">
                  质量 m = <tspan fill="#f1f5f9" fontWeight="bold">{massKg.toFixed(2)} kg</tspan>
                </text>
                <text x="12" y="56" fill="#94a3b8" fontSize="11">
                  重力 g = <tspan fill="#f1f5f9" fontWeight="bold">{g.toFixed(2)} m/s²</tspan>
                </text>
                <text x="12" y="76" fill="#38bdf8" fontSize="11" fontWeight="bold">
                  理论周期 T = {theoreticalPeriodSmall.toFixed(2)} s
                </text>
              </g>

              {/* Real-time Dynamic State Overlay */}
              <g transform={`translate(${width - 175}, 30)`}>
                <rect x="0" y="0" width="158" height="92" rx="8" fill="#0f172a" fillOpacity="0.8" stroke="#334155" strokeWidth="1" />
                <text x="12" y="20" fill="#94a3b8" fontSize="11">
                  实时摆角: <tspan fill="#f1f5f9" fontWeight="bold">{((angle * 180) / Math.PI).toFixed(1)}°</tspan>
                </text>
                <text x="12" y="38" fill="#94a3b8" fontSize="11">
                  线速度: <tspan fill="#22c55e" fontWeight="bold">{Math.abs(linearVelocity).toFixed(2)} m/s</tspan>
                </text>
                <text x="12" y="56" fill="#94a3b8" fontSize="11">
                  相对高度: <tspan fill="#60a5fa" fontWeight="bold">{currentHeightMeters.toFixed(3)} m</tspan>
                </text>
                <text x="12" y="76" fill="#94a3b8" fontSize="11">
                  已摆动周期: <tspan fill="#f59e0b" fontWeight="bold">{cycleCount} 次</tspan>
                </text>
              </g>

              {/* Touch Drag Prompt overlay */}
              <text x={pivotX} y={height - 15} fill="#64748b" fontSize="11" textAnchor="middle">
                💡 提示：按住摆球可在屏幕上直接拖动调节释放角度
              </text>
            </svg>
          </div>

          {/* Real-time Dynamic Mechanical Energy Conservation Bars */}
          <div className="w-full mt-4 bg-slate-50 border border-slate-200/90 rounded-xl p-4 flex flex-col gap-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-indigo-600" />
                实时机械能守恒条（E_总 = E_动 + E_势）（若动画卡顿可将鼠标光标移出窗口）
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {enableDamping ? '⚠️ 空气阻力开启（能量缓慢消耗）' : '✨ 理想状态：机械能量 100% 守恒'}
              </span>
            </div>

            {/* Kinetic Energy Bar */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-emerald-700 flex items-center gap-1.5 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  动能 E_k (½mv²): {ek.toFixed(2)} J
                </span>
                <span className="text-emerald-700 font-mono font-bold">{ekPercent.toFixed(0)}%</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-75 ease-out rounded-full"
                  style={{ width: `${ekPercent}%` }}
                />
              </div>
            </div>

            {/* Potential Energy Bar */}
            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-blue-700 flex items-center gap-1.5 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                  重力势能 E_p (mgh): {ep.toFixed(2)} J
                </span>
                <span className="text-blue-700 font-mono font-bold">{epPercent.toFixed(0)}%</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-75 ease-out rounded-full"
                  style={{ width: `${epPercent}%` }}
                />
              </div>
            </div>

            {/* Energy Summary Pills */}
            <div className="pt-2 border-t border-slate-200/70 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white border border-slate-200 rounded-lg p-2">
                <div className="text-[11px] text-slate-500">当前动能</div>
                <div className="font-bold text-emerald-600 mt-0.5">{ek.toFixed(2)} J</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-2">
                <div className="text-[11px] text-slate-500">当前势能</div>
                <div className="font-bold text-blue-600 mt-0.5">{ep.toFixed(2)} J</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-2">
                <div className="text-[11px] text-slate-500">机械能总和</div>
                <div className="font-bold text-indigo-600 mt-0.5">{totalEnergy.toFixed(2)} J</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Controls Panel */}
        <div className="w-full lg:w-84 flex flex-col gap-4">
          {/* Parameter Tuning Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-600" />
              单摆物理参数调控
            </h3>

            {/* String Length Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-700 font-medium mb-1.5">
                <span>摆绳长度 L (0.4m ~ 2.4m)</span>
                <span className="font-bold text-indigo-600 font-mono">{lengthMeters.toFixed(2)} m</span>
              </div>
              <input
                id="pendulum-length-slider"
                type="range"
                min="0.4"
                max="2.4"
                step="0.1"
                value={lengthMeters}
                onChange={e => setLengthMeters(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>短摆 (快)</span>
                <span>标准 1.2m</span>
                <span>长摆 (慢)</span>
              </div>
            </div>

            {/* Bob Mass Slider (Crucial Teaching Experiment) */}
            <div>
              <div className="flex justify-between text-xs text-slate-700 font-medium mb-1.5">
                <span className="flex items-center gap-1">
                  摆球质量 m (0.2kg ~ 2.5kg)
                </span>
                <span className="font-bold text-indigo-600 font-mono">{massKg.toFixed(2)} kg</span>
              </div>
              <input
                id="pendulum-mass-slider"
                type="range"
                min="0.2"
                max="2.5"
                step="0.1"
                value={massKg}
                onChange={e => setMassKg(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <p className="text-[10px] text-amber-700 bg-amber-50 rounded-md p-1.5 mt-1 border border-amber-200/60">
                ⭐ 课堂探究：调节质量观察周期是否改变？（验证与质量无关）
              </p>
            </div>

            {/* Initial Angle Slider */}
            <div>
              <div className="flex justify-between text-xs text-slate-700 font-medium mb-1.5">
                <span>初始释放摆角 (5° ~ 75°)</span>
                <span className="font-bold text-indigo-600 font-mono">{initialAngleDeg}°</span>
              </div>
              <input
                id="pendulum-angle-slider"
                type="range"
                min="5"
                max="75"
                step="5"
                value={initialAngleDeg}
                onChange={e => setInitialAngleDeg(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>微小摆角 (&lt;15°，严格简谐)</span>
                <span>大角度</span>
              </div>
            </div>

            {/* Planetary Gravity Environments */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-800">
                  天体重力场 g
                </label>
                <span className="text-[11px] font-mono text-indigo-600 font-bold">
                  {g.toFixed(2)} m/s²
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {CELESTIAL_ENVIRONMENTS.map(planet => (
                  <button
                    key={planet.id}
                    id={`planet-${planet.id}-btn`}
                    onClick={() => {
                      setIsCustomG(false);
                      setEnvId(planet.id);
                    }}
                    className={`p-2 rounded-xl border text-xs flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      !isCustomG && envId === planet.id
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-bold shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base">{planet.icon}</span>
                    <span className="text-[11px]">{planet.shortName}</span>
                  </button>
                ))}
              </div>

              {/* Custom g toggle */}
              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCustomG}
                    onChange={e => setIsCustomG(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>自定义重力数值</span>
                </label>
                {isCustomG && (
                  <input
                    type="number"
                    min="0.1"
                    max="35"
                    step="0.1"
                    value={customG}
                    onChange={e => setCustomG(Math.max(0.1, Number(e.target.value)))}
                    className="w-20 px-2 py-0.5 text-xs border border-slate-300 rounded font-mono text-right"
                  />
                )}
              </div>
            </div>

            {/* Visual Vector & Damping Toggles */}
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2 text-xs">
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  id="toggle-velocity-vector"
                  type="checkbox"
                  checked={showVelocityVector}
                  onChange={e => setShowVelocityVector(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                  速度矢量箭头 (绿色切向速度)
                </span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  id="toggle-force-vector"
                  type="checkbox"
                  checked={showForceVector}
                  onChange={e => setShowForceVector(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>
                  切向恢复力箭头 (红色回复力)
                </span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  id="toggle-trajectory"
                  type="checkbox"
                  checked={showTrajectory}
                  onChange={e => setShowTrajectory(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>显示单摆摆动轨迹弧线</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                <input
                  id="toggle-damping"
                  type="checkbox"
                  checked={enableDamping}
                  onChange={e => setEnableDamping(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span className="flex items-center gap-1 text-slate-800">
                  <Wind className="w-3.5 h-3.5 text-slate-500" />
                  开启现实空气阻尼 (振幅缓慢衰减)
                </span>
              </label>
            </div>
          </div>

          {/* Classroom Period Verification Stopwatch */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Timer className="w-4 h-4 text-indigo-600" />
                单摆周期实测秒表
              </h3>
              <span className="text-[11px] text-slate-500">课堂测量验证</span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">累计测量时间:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {timedDuration.toFixed(2)} s
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">记录摆动完整周期数:</span>
                <span className="font-mono font-bold text-indigo-600">
                  {timedCycles} 次
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                <span className="text-slate-700 font-semibold">实测平均周期 T_测:</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">
                  {timedCycles > 0 ? `${measuredPeriod.toFixed(3)} s` : '--'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700">理论计算周期 T_理:</span>
                <span className="font-mono font-bold text-blue-600">
                  {theoreticalPeriodSmall.toFixed(3)} s
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="stopwatch-toggle-btn"
                onClick={handleToggleTiming}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  isTimingActive
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isTimingActive ? '停止计时' : '开始记录周期'}
              </button>
              <button
                id="stopwatch-reset-btn"
                onClick={handleResetTiming}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                清零
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Physics Principles & Inquiry Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-indigo-50/70 border border-indigo-200/70 rounded-2xl p-4.5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>1. 伽利略单摆等时性</span>
          </div>
          <p className="text-xs text-indigo-950/90 leading-relaxed">
            在振幅较小时，单摆的周期只与<strong>摆绳长度 L</strong>和<strong>重力加速度 g</strong>有关，与<strong>摆球质量 m</strong>及振幅无关。无论轻球还是重球，相同摆长下的摆动节拍完全一致！
          </p>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-2xl p-4.5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>2. 动能与势能守恒转换</span>
          </div>
          <p className="text-xs text-emerald-950/90 leading-relaxed">
            在最高点时，速度为0，<strong>动能为0，重力势能达到最大</strong>；在通过最低点时，高度最低，<strong>重力势能为0，动能与速度达到最大</strong>。理想真空下总量保持恒定。
          </p>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-4.5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <Zap className="w-4 h-4 text-amber-600" />
            <span>3. 恢复力与运动规律</span>
          </div>
          <p className="text-xs text-amber-950/90 leading-relaxed">
            单摆摆动的动力来源是重力沿运动切线方向的分力：<code className="bg-amber-100/90 px-1 py-0.5 rounded font-mono font-bold">F_切 = -mg sinθ</code>。这个力始终指向平衡中心，驱动摆球来回振荡。
          </p>
        </div>
      </div>
    </div>
  );
};
