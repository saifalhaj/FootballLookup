"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

export type Goal = {
  t: string; // tournament id — see scripts/bake.mjs
  tx: number; ty: number; // where the ball crossed the goal line (m): lateral, height
  ox: number; oz: number; // where it was struck (m): lateral, depth into pitch
  xg: number | null;
  player: string | null;
  team: string | null;
  opponent: string | null;
  stage: string | null;
  minute: number | null;
  season: string | null;
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

type Arc = {
  line: THREE.Line;
  mat: THREE.LineBasicMaterial;
  pts: number[]; // flat xyz along the flight
  count: number;
  color: THREE.Color;
  end: THREE.Vector3; // the measured point it crossed the line
  dur: number; // flight time
  targetOp: number;
  replayAt: number | null;
  flashAt: number | null;
};

function buildArcs(goals: Goal[]): Arc[] {
  const N = 48;
  return goals.map((g) => {
    const imp = g.xg == null ? 0.5 : 1 - Math.max(0, Math.min(1, g.xg));
    // Only two points of each flight are measured: where it was struck and
    // where it crossed the line. The curve between is inferred, so keep it
    // physically motivated rather than decorative — longer shots and higher
    // finishes arc more. (It used to be driven by xG, which implied ball-flight
    // data that does not exist.)
    const dist = Math.hypot(g.ox, g.oz);
    const loft = 0.25 + dist * 0.055 + g.ty * 0.35;
    const pos: number[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const x = g.ox + (g.tx - g.ox) * t;
      const z = g.oz * (1 - t);
      const y = g.ty * t + 4 * loft * t * (1 - t);
      pos.push(x, y, z);
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geom.setDrawRange(0, 0);
    const color = heat(imp);
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.05,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return {
      line: new THREE.Line(geom, mat),
      mat,
      pts: pos,
      count: N + 1,
      color,
      end: new THREE.Vector3(g.tx, g.ty, 0),
      // Flight time scales with distance, so a thirty-yard strike hangs in the
      // air and a tap-in is instant — when they all replay at once, the galaxy
      // resolves in order of distance.
      dur: 0.35 + dist * 0.035,
      targetOp: 0.05,
      replayAt: null,
      flashAt: null,
    };
  });
}

const _v = new THREE.Vector3();
const _dummy = new THREE.Object3D();

function sampleArc(a: Arc, p: number, out: THREE.Vector3) {
  const f = p * (a.count - 1);
  const i0 = Math.max(0, Math.min(a.count - 1, Math.floor(f)));
  const i1 = Math.min(a.count - 1, i0 + 1);
  const t = f - i0;
  const o0 = i0 * 3, o1 = i1 * 3;
  out.set(
    a.pts[o0] + (a.pts[o1] - a.pts[o0]) * t,
    a.pts[o0 + 1] + (a.pts[o1 + 1] - a.pts[o0 + 1]) * t,
    a.pts[o0 + 2] + (a.pts[o1 + 2] - a.pts[o0 + 2]) * t,
  );
}

function GoalFrame() {
  const obj = useMemo(() => {
    const g = new THREE.Group();
    const NZ = -1.9;
    // Neutral greys — no blue or green tint. The pitch is monochrome; only the
    // goals carry colour.
    const frameMat = new THREE.LineBasicMaterial({ color: 0xcfcfd4, transparent: true, opacity: 0.42 });
    const netMat = new THREE.LineBasicMaterial({ color: 0x8f8f95, transparent: true, opacity: 0.12 });
    const groundMat = new THREE.LineBasicMaterial({ color: 0x707074, transparent: true, opacity: 0.2 });
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
  replayAllNonce,
  focusNonce,
}: {
  goals: Goal[];
  highlights: Set<number>;
  focusId: number | null;
  replayAllNonce: number;
  focusNonce: number;
}) {
  const arcs = useMemo(() => buildArcs(goals), [goals]);
  const nowRef = useRef(0);
  const balls = useRef<THREE.InstancedMesh>(null);
  const flashes = useRef<THREE.InstancedMesh>(null);
  const marker = useRef<THREE.Mesh>(null);

  const startReplay = useCallback(
    (idxs: number[], stagger: number) => {
      const t0 = nowRef.current;
      idxs.forEach((i, k) => {
        const a = arcs[i];
        if (!a) return;
        a.replayAt = t0 + k * stagger;
        a.flashAt = null;
      });
    },
    [arcs],
  );

  // Tint each ball and impact flash to match its arc.
  useEffect(() => {
    const b = balls.current, f = flashes.current;
    if (!b || !f) return;
    for (let i = 0; i < arcs.length; i++) {
      b.setColorAt(i, arcs[i].color);
      f.setColorAt(i, arcs[i].color);
    }
    if (b.instanceColor) b.instanceColor.needsUpdate = true;
    if (f.instanceColor) f.instanceColor.needsUpdate = true;
  }, [arcs]);

  // Intro: every goal flies in, staggered.
  useEffect(() => {
    startReplay(arcs.map((_, i) => i), 0.03);
  }, [arcs, startReplay]);

  // Focusing a goal (or tapping replay) re-flies that one.
  useEffect(() => {
    if (focusId == null) return;
    startReplay([focusId], 0);
  }, [focusId, focusNonce, startReplay]);

  // "Replay all" — every ball leaves at the same instant.
  useEffect(() => {
    if (!replayAllNonce) return;
    startReplay(arcs.map((_, i) => i), 0);
  }, [replayAllNonce, arcs, startReplay]);

  useEffect(() => {
    const showAll = focusId == null;
    const contextOp = showAll ? 0.42 : 0.14;
    for (let i = 0; i < arcs.length; i++) {
      arcs[i].targetOp = i === focusId ? 1.0 : highlights.has(i) ? contextOp : 0.02;
    }
  }, [arcs, highlights, focusId]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    nowRef.current = t;
    const bm = balls.current, fm = flashes.current;

    for (let i = 0; i < arcs.length; i++) {
      const a = arcs[i];
      let p = 1;
      let flying = false;
      if (a.replayAt != null) {
        const dt = t - a.replayAt;
        if (dt < 0) p = 0;
        else if (dt >= a.dur) { p = 1; a.replayAt = null; a.flashAt = t; }
        else { p = dt / a.dur; flying = true; }
      }
      // The trail draws itself in behind the ball.
      a.line.geometry.setDrawRange(0, Math.max(0, Math.round(p * a.count)));
      a.mat.opacity += (a.targetOp - a.mat.opacity) * 0.12;

      if (bm) {
        if (flying) {
          sampleArc(a, p, _v);
          _dummy.position.copy(_v);
          _dummy.scale.setScalar(1);
        } else {
          _dummy.scale.setScalar(0);
        }
        _dummy.updateMatrix();
        bm.setMatrixAt(i, _dummy.matrix);
      }
      if (fm) {
        let s = 0;
        if (a.flashAt != null) {
          const ft = (t - a.flashAt) / 0.4;
          if (ft >= 1) a.flashAt = null;
          else s = Math.sin(ft * Math.PI) * 1.7; // pop, then gone
        }
        _dummy.position.copy(a.end);
        _dummy.scale.setScalar(s);
        _dummy.updateMatrix();
        fm.setMatrixAt(i, _dummy.matrix);
      }
    }
    if (bm) bm.instanceMatrix.needsUpdate = true;
    if (fm) fm.instanceMatrix.needsUpdate = true;
    if (marker.current) marker.current.scale.setScalar(1 + Math.sin(t * 3) * 0.18);
  });

  const focus = focusId != null ? goals[focusId] : null;
  const n = Math.max(1, arcs.length);

  return (
    <group>
      {arcs.map((a, i) => (
        <primitive key={i} object={a.line} />
      ))}
      <GoalFrame />
      <instancedMesh key={`b${n}`} ref={balls} args={[undefined, undefined, n]} frustumCulled={false}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      <instancedMesh key={`f${n}`} ref={flashes} args={[undefined, undefined, n]} frustumCulled={false}>
        <sphereGeometry args={[0.17, 12, 12]} />
        <meshBasicMaterial
          toneMapped={false}
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
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
  replayAllNonce = 0,
  focusNonce = 0,
}: {
  goals: Goal[];
  highlights: Set<number>;
  focusId: number | null;
  replayAllNonce?: number;
  focusNonce?: number;
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
    // Some embedded/preview contexts don't fire the initial ResizeObserver that
    // R3F waits on; nudge it once after mount so the renderer always starts.
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
        <color attach="background" args={[0.014, 0.014, 0.016]} />
        <fog attach="fog" args={[0x060606, 26, 52]} />
        <Scene
          goals={goals}
          highlights={highlights}
          focusId={focusId}
          replayAllNonce={replayAllNonce}
          focusNonce={focusNonce}
        />
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
          <Bloom intensity={1.45} luminanceThreshold={0.0} luminanceSmoothing={0.32} mipmapBlur radius={0.72} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
