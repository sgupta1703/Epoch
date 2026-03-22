import { useEffect, useRef, useState } from 'react';

const CATEGORY_COLORS = {
  Politics:    0xb84c2b,
  War:         0xc0392b,
  Culture:     0x8e44ad,
  Economy:     0x27ae60,
  Society:     0x2980b9,
  Science:     0x16a085,
  Religion:    0xd4ac0d,
  Exploration: 0xe67e22,
};

const CATEGORY_HEX = {
  Politics:    '#b84c2b',
  War:         '#c0392b',
  Culture:     '#8e44ad',
  Economy:     '#27ae60',
  Society:     '#2980b9',
  Science:     '#16a085',
  Religion:    '#d4ac0d',
  Exploration: '#e67e22',
};

export default function TimelineVisualization({ events = [], onSelectEvent, selectedEvent }) {
  const mountRef  = useRef(null);
  const sceneRef  = useRef(null);
  const rendRef   = useRef(null);
  const cameraRef = useRef(null);
  const frameRef  = useRef(null);
  const nodesRef  = useRef([]);
  const mouseRef  = useRef({ x: 0, y: 0 });
  const orbitRef  = useRef({ theta: 0, phi: Math.PI / 2.8, r: 28, autoRotate: true });
  const isDragging = useRef(false);
  const lastMouse  = useRef({ x: 0, y: 0 });

  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [tooltip, setTooltip]     = useState({ visible: false, x: 0, y: 0, event: null });

  useEffect(() => {
    if (!events.length || !mountRef.current) return;

    const THREE = window.THREE;
    if (!THREE) {
      console.error('Three.js not loaded');
      return;
    }

    const W = mountRef.current.clientWidth;
    const H = mountRef.current.clientHeight;

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0807);
    scene.fog = new THREE.FogExp2(0x0a0807, 0.018);
    sceneRef.current = scene;

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 200);
    cameraRef.current = camera;

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendRef.current = renderer;

    // ── Ambient + directional light ──
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const dir = new THREE.DirectionalLight(0xffeedd, 1.2);
    dir.position.set(10, 20, 10);
    scene.add(dir);

    // ── Build timeline path ──
    // Events spread along a gentle S-curve in 3D
    const sorted = [...events].sort((a, b) => a.date_sort - b.date_sort);
    const n = sorted.length;
    const spread = Math.max(n * 2.2, 20);

    const positions = sorted.map((_, i) => {
      const t = n > 1 ? i / (n - 1) : 0.5;
      const x = (t - 0.5) * spread;
      const y = Math.sin(t * Math.PI) * 2.5;
      const z = Math.sin(t * Math.PI * 2) * 3;
      return new THREE.Vector3(x, y, z);
    });

    // ── Tube path ──
    const curve = new THREE.CatmullRomCurve3(positions);
    const tubeGeo  = new THREE.TubeGeometry(curve, 120, 0.06, 8, false);
    const tubeMat  = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8, metalness: 0.1 });
    scene.add(new THREE.Mesh(tubeGeo, tubeMat));

    // ── Event nodes ──
    const nodes = [];
    sorted.forEach((evt, i) => {
      const color = CATEGORY_COLORS[evt.category] || 0xc8a96e;
      const pos   = positions[i];

      // Outer glow sphere
      const glowGeo = new THREE.SphereGeometry(0.55, 16, 16);
      const glowMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.4,
        transparent: true,
        opacity: 0.25,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(pos);
      scene.add(glow);

      // Core sphere
      const coreGeo = new THREE.SphereGeometry(0.32, 16, 16);
      const coreMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.6,
        roughness: 0.3,
        metalness: 0.2,
      });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.copy(pos);
      scene.add(core);

      // Vertical connector line
      const linePts = [
        new THREE.Vector3(pos.x, pos.y, pos.z),
        new THREE.Vector3(pos.x, pos.y - 1.2, pos.z),
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
      const lineMat = new THREE.LineBasicMaterial({ color, opacity: 0.4, transparent: true });
      scene.add(new THREE.Line(lineGeo, lineMat));

      nodes.push({ core, glow, coreMat, glowMat, event: evt, originalColor: color });
    });
    nodesRef.current = nodes;

    // ── Star field ──
    const starGeo = new THREE.BufferGeometry();
    const starPos = [];
    for (let i = 0; i < 600; i++) {
      starPos.push((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0x554433, size: 0.12 });
    scene.add(new THREE.Points(starGeo, starMat));

    // ── Raycaster ──
    const raycaster = new THREE.Raycaster();
    const mouse2D   = new THREE.Vector2();

    function getCoreMeshes() {
      return nodesRef.current.map(n => n.core);
    }

    function onMouseMove(e) {
      const rect = mountRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouseRef.current = { x: e.clientX, y: e.clientY };
      mouse2D.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
      mouse2D.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse2D, camera);
      const hits = raycaster.intersectObjects(getCoreMeshes());

      if (hits.length > 0) {
        const hit = nodesRef.current.find(n => n.core === hits[0].object);
        if (hit) {
          setHoveredEvent(hit.event);
          setTooltip({ visible: true, x: e.clientX - rect.left, y: e.clientY - rect.top - 12, event: hit.event });
          mountRef.current.style.cursor = 'pointer';
        }
      } else {
        setHoveredEvent(null);
        setTooltip(t => ({ ...t, visible: false }));
        mountRef.current.style.cursor = 'grab';
      }

      // Orbit drag
      if (isDragging.current) {
        const dx = e.clientX - lastMouse.current.x;
        const dy = e.clientY - lastMouse.current.y;
        orbitRef.current.theta -= dx * 0.008;
        orbitRef.current.phi   = Math.max(0.3, Math.min(Math.PI - 0.3, orbitRef.current.phi + dy * 0.008));
        lastMouse.current = { x: e.clientX, y: e.clientY };
        orbitRef.current.autoRotate = false;
      }
    }

    function onMouseDown(e) {
      isDragging.current = true;
      lastMouse.current  = { x: e.clientX, y: e.clientY };
      orbitRef.current.autoRotate = false;
      if (mountRef.current) mountRef.current.style.cursor = 'grabbing';
    }

    function onMouseUp(e) {
      isDragging.current = false;
      if (mountRef.current) mountRef.current.style.cursor = 'grab';

      // Click detection — only fire if mouse barely moved
      const dx = Math.abs(e.clientX - lastMouse.current.x);
      const dy = Math.abs(e.clientY - lastMouse.current.y);
      if (dx < 4 && dy < 4) {
        const rect = mountRef.current?.getBoundingClientRect();
        if (!rect) return;
        mouse2D.x = ((e.clientX - rect.left) / rect.width)  * 2 - 1;
        mouse2D.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse2D, camera);
        const hits = raycaster.intersectObjects(getCoreMeshes());
        if (hits.length > 0) {
          const hit = nodesRef.current.find(n => n.core === hits[0].object);
          if (hit && onSelectEvent) onSelectEvent(hit.event);
        }
      }
    }

    function onWheel(e) {
      orbitRef.current.r = Math.max(10, Math.min(60, orbitRef.current.r + e.deltaY * 0.04));
    }

    const el = mountRef.current;
    el.addEventListener('mousemove', onMouseMove);
    el.addEventListener('mousedown', onMouseDown);
    el.addEventListener('mouseup', onMouseUp);
    el.addEventListener('wheel', onWheel, { passive: true });

    // ── Animate ──
    let t = 0;
    function animate() {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.004;

      if (orbitRef.current.autoRotate) {
        orbitRef.current.theta += 0.003;
      }

      const { theta, phi, r } = orbitRef.current;
      camera.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
      );
      camera.lookAt(0, 0, 0);

      // Pulse nodes
      nodesRef.current.forEach(({ core, glow, coreMat, glowMat, event }) => {
        const isHovered  = hoveredEvent?.id === event.id;
        const isSelected = selectedEvent?.id === event.id;
        const pulse = 1 + Math.sin(t * 3 + event.date_sort * 0.1) * 0.08;

        if (isSelected) {
          core.scale.setScalar(1.5 * pulse);
          glow.scale.setScalar(2.2 * pulse);
          coreMat.emissiveIntensity = 1.2;
          glowMat.opacity = 0.5;
        } else if (isHovered) {
          core.scale.setScalar(1.3 * pulse);
          glow.scale.setScalar(1.9 * pulse);
          coreMat.emissiveIntensity = 1.0;
          glowMat.opacity = 0.4;
        } else {
          core.scale.setScalar(pulse);
          glow.scale.setScalar(1.4 * pulse);
          coreMat.emissiveIntensity = 0.6;
          glowMat.opacity = 0.2;
        }
      });

      renderer.render(scene, camera);
    }
    animate();

    // ── Resize ──
    function onResize() {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      el.removeEventListener('mousemove', onMouseMove);
      el.removeEventListener('mousedown', onMouseDown);
      el.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [events]);

  // Update node highlights reactively
  useEffect(() => {
    nodesRef.current.forEach(({ coreMat, event }) => {
      const isSelected = selectedEvent?.id === event.id;
      coreMat.emissiveIntensity = isSelected ? 1.2 : 0.6;
    });
  }, [selectedEvent]);

  const categories = [...new Set(events.map(e => e.category).filter(Boolean))];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Canvas mount */}
      <div
        ref={mountRef}
        style={{ width: '100%', height: '100%', cursor: 'grab', borderRadius: 8, overflow: 'hidden' }}
      />

      {/* Tooltip */}
      {tooltip.visible && tooltip.event && (
        <div style={{
          position: 'absolute',
          left: tooltip.x + 12,
          top: tooltip.y - 40,
          background: 'rgba(12,10,8,0.92)',
          border: `1px solid ${CATEGORY_HEX[tooltip.event.category] || '#c8a96e'}`,
          borderRadius: 4,
          padding: '6px 12px',
          pointerEvents: 'none',
          zIndex: 10,
          maxWidth: 220,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: CATEGORY_HEX[tooltip.event.category] || '#c8a96e', marginBottom: 1 }}>
            {tooltip.event.date_label}
          </div>
          <div style={{ fontSize: 13, color: '#ede8dc', fontWeight: 500 }}>
            {tooltip.event.title}
          </div>
        </div>
      )}

      {/* Category legend */}
      {categories.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 12, left: 12,
          display: 'flex', flexWrap: 'wrap', gap: 6,
          maxWidth: '60%',
        }}>
          {categories.map(cat => (
            <span key={cat} style={{
              fontSize: 10, fontWeight: 500, padding: '2px 7px',
              borderRadius: 3, letterSpacing: '0.06em',
              background: `${CATEGORY_HEX[cat]}22`,
              color: CATEGORY_HEX[cat] || '#c8a96e',
              border: `1px solid ${CATEGORY_HEX[cat]}55`,
            }}>
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Controls hint */}
      <div style={{
        position: 'absolute', bottom: 12, right: 12,
        fontSize: 10, color: 'rgba(237,232,220,0.3)', letterSpacing: '0.06em',
      }}>
        Drag to rotate · Scroll to zoom · Click to explore
      </div>
    </div>
  );
}