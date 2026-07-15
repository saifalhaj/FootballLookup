"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

export type Goal = {
  tx: number; ty: number; // where the ball crossed the goal line (m): lateral, height
  ox: number; oz: number; // where it was struck (m): lateral, depth into pitch
  xg: number | null;
  player: string | null;
  team: string | null;
  opponent: string | null;
  stage: string | null;
  minute: number | null;
  pen: boolean;
};

const POST = 3.66; // half goal width (m)
const BAR = 2.44; // crossbar height (m)

// Heat ramp: probable goals (high xG) stay cool blue; improbable ones burn hot.
const STOPS: [number, number, number, number][] = [
  [0.0, 0.2, 0.58, 1.0],
  [0.35, 0.42, 0.9, 1.0],
  [0.6, 1.0, 0.86, 0.52],
  [0.82, 1.0, 0.46, 0.24],
  [1.0, 1.0, 0.28, 0.42],
];
function heat(t: number): THREE.Color {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const a = STOPS[i - 1], b = STOPS[i];
      const f = (t - a[0]) / (b[0] - a[0]);
      return new THREE.Color(
        a[1] + (b[1] - a[1]) * f,
        a[2] + (b[2] - a[2]) * f,
        a[3] + (b[3] - a[3]) * f,
      );
    }
  }
  const l = STOPS[STOPS.length - 1];
  return new THREE.Color(l[1], l[2], l[3]);
}

type Arc = { line: THREE.Line; mat: THREE.LineBasicMaterial; count: number; delay: number; dur: number; targetOp: number };

function buildArcs(goals: Goal[]): Arc[] {
  const N = 48;
  return goals.map((g, idx) => {
    const imp = g.xg == null ? 0.5 : 1 - Math.max(0, Math.min(1, g.xg));
    const loft = 0.8 + imp * 2.6 + Math.max(0, g.ty - 1.2) * 0.5;
    const pos: number[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = g.ox + (g.tx - g.ox) * t;
      const z = g.oz * (1 - t);
      const baseY = g.ty * t;
      const y = baseY + 4 * loft * t * (1 - t);
      pos.push(x, y, z);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geom.setDrawRange(0, 0);
    const mat = new THREE.LineBasicMaterial({
      color: heat(imp),
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const line = new THREE.Line(geom, mat);
    const delay = (idx / goals.length) * 4.2;
    return { line, mat, count: N + 1, delay, dur: 1.1, targetOp: 0.05 };
  });
}

function GoalFrame() {
  const obj = useMemo(() => {
    const g = new THREE.Group();
    const NZ = -1.9;
    const frameMat = new THREE.LineBasicMaterial({ color: 0x9fb4d0, transparent: true, opacity: 0.5 });
    const netMat = new THREE.LineBasicMaterial({ color: 0x6f88a8, transparent: true, opacity: 0.13 });
    const groundMat = new THREE.LineBasicMaterial({ color: 0x3f8a5f, transparent: true, opacity: 0.22 });
    const seg = (p: number[], m: THREE.Material) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
      return new THREE.Line(geo, m as THREE.LineBasicMaterial);
    };
    g.add(seg([-POST, 0, 0, -POST, BAR, 0], frameMat));
    g.add(seg([POST, 0, 0, POST, BAR, 0], frameMat));
    g.add(seg([-POST, BAR, 0, POST, BAR, 0], frameMat));
    g.add(seg([-POST, BAR, 0, -POST, BAR, NZ], frameMat));
    g.add(seg([POST, BAR, 0, POST, BAR, NZ], frameMat));
    g.add(seg([-POST, 0, 0, -POST, 0, NZ], frameMat));
    g.add(seg([POST, 0, 0, POST, 0, NZ], frameMat));
    for (let x = -POST; x <= POST + 0.001; x += (POST * 2) / 6) g.add(seg([x, 0, NZ, x, BAR, NZ], netMat));
    for (let y = 0; y <= BAR + 0.001; y += BAR / 4) g.add(seg([-POST, y, NZ, POST, y, NZ], netMat));
    g.add(seg([-POST - 4, 0, 0, POST + 4, 0, 0], groundMat));
    g.add(seg([-9.15, 0, 0, -9.15, 0, 5.5], groundMat));
    g.add(seg([9.15, 0, 0, 9.15, 0, 5.5], groundMat));
    g.add(seg([-9.15, 0, 5.5, 9.15, 0, 5.5], groundMat));
    return g;
  }, []);
  return <primitive object={obj} />;
}

function Scene({
  goals,
  highlights,
  focusId,
}: {
  goals: Goal[];
  highlights: Set<number>;
  focusId: number | null;
}) {
  const arcs = useMemo(() => buildArcs(goals), [goals]);
  const t0 = useRef<number | null>(null);
  const marker = useRef<THREE.Mesh>(null);

  // Assign target opacities whenever the focus/selection changes.
  // Tour mode (a goal is focused): that arc blazes, the other picks are faint
  // context, the other ~180 goals are barely-there dust — keeps it minimal.
  // "See all" mode (nothing focused): the whole galaxy glows evenly.
  useEffect(() => {
    const showAll = focusId == null;
    const contextOp = showAll ? 0.42 : 0.14;
    for (let i = 0; i < arcs.length; i++) {
      arcs[i].targetOp = i === focusId ? 1.0 : highlights.has(i) ? contextOp : 0.02;
    }
  }, [arcs, highlights, focusId]);

  useFrame(({ clock }) => {
    if (t0.current === null) t0.current = clock.elapsedTime;
    const time = clock.elapsedTime - t0.current;
    for (const a of arcs) {
      // One-time draw-in; then hold.
      const p = Math.min(1, Math.max(0, (time - a.delay) / a.dur));
      a.line.geometry.setDrawRange(0, Math.floor(p * a.count));
      // Ease opacity toward its target so focus changes glide.
      a.mat.opacity += (a.targetOp - a.mat.opacity) * 0.12;
    }
    if (marker.current) {
      const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.18; // gentle pulse
      marker.current.scale.setScalar(s);
    }
  });

  const focus = focusId != null ? goals[focusId] : null;

  return (
    <group>
      {arcs.map((a, i) => (
        <primitive key={i} object={a.line} />
      ))}
      <GoalFrame />
      {focus && (
        <mesh ref={marker} position={[focus.tx, focus.ty, 0]}>
          <sphereGeometry args={[0.13, 18, 18]} />
          <meshBasicMaterial color={"#fff6e6"} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

export default function GoalGalaxy({
  goals,
  highlights,
  focusId,
}: {
  goals: Goal[];
  highlights: Set<number>;
  focusId: number | null;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    const update = () => {
      const d = document.documentElement;
      const w = window.innerWidth || d.clientWidth || window.screen?.width || 1280;
      const h = window.innerHeight || d.clientHeight || window.screen?.height || 720;
      setSize({ w, h });
    };
    update();
    window.addEventListener("resize", update);
    const kick = requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
    return () => {
      window.removeEventListener("resize", update);
      cancelAnimationFrame(kick);
    };
  }, []);
  if (!size) return null;

  return (
    <div className="scene" style={{ position: "fixed", top: 0, left: 0, width: size.w, height: size.h }}>
      <Canvas
        style={{ width: "100%", height: "100%" }}
        camera={{ position: [0.6, 4.0, 22], fov: 42 }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={[0.024, 0.035, 0.055]} />
        <fog attach="fog" args={[0x060910, 26, 52]} />
        <Scene goals={goals} highlights={highlights} focusId={focusId} />
        <OrbitControls
          target={[0, 1.2, 0.2]}
          enablePan={false}
          autoRotate
          autoRotateSpeed={0.24}
          minDistance={10}
          maxDistance={34}
          minPolarAngle={Math.PI * 0.16}
          maxPolarAngle={Math.PI * 0.52}
        />
        <EffectComposer>
          <Bloom intensity={1.15} luminanceThreshold={0.02} luminanceSmoothing={0.3} mipmapBlur radius={0.7} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
