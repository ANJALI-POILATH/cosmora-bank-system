import { useEffect, useRef } from 'react';

// Fixed full-screen galaxy: nebula glows, orbit lines and an animated
// starfield that twinkles, drifts with the pointer and throws shooting stars.
export default function Cosmos() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const palette = ['#ffffff', '#e9e2ff', '#c4b5fd', '#f6d5c8', '#a5b4fc'];
    let stars = [];
    let shooting = [];
    let width = 0;
    let height = 0;
    let frame = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.min(420, Math.round((width * height) / 3800));
      stars = Array.from({ length: count }, () => {
        const depth = Math.random();
        return {
          x: Math.random() * width, y: Math.random() * height, depth,
          r: 0.3 + depth * 1.4, phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 1.6,
          color: palette[Math.floor(Math.random() * palette.length)],
        };
      });
    }

    function onMove(event) {
      pointer.tx = (event.clientX / width - 0.5) * 2;
      pointer.ty = (event.clientY / height - 0.5) * 2;
    }

    function draw(time) {
      const t = time / 1000;
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      ctx.clearRect(0, 0, width, height);
      for (const star of stars) {
        const shift = star.depth * 18;
        const x = (star.x - pointer.x * shift + width) % width;
        const y = (star.y - pointer.y * shift + (reduced ? 0 : t * star.depth * 3) + height) % height;
        const twinkle = reduced ? 0.8 : 0.45 + 0.55 * Math.abs(Math.sin(t * star.speed + star.phase));
        ctx.globalAlpha = twinkle;
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(x, y, star.r, 0, Math.PI * 2);
        ctx.fill();
        if (star.r > 1.45) { // a soft cross-flare on the brightest stars
          ctx.globalAlpha = twinkle * 0.35;
          ctx.fillRect(x - star.r * 3, y - 0.3, star.r * 6, 0.6);
          ctx.fillRect(x - 0.3, y - star.r * 3, 0.6, star.r * 6);
        }
      }

      if (!reduced && Math.random() < 0.006 && shooting.length < 2) {
        shooting.push({ x: Math.random() * width * 0.8 + width * 0.2, y: Math.random() * height * 0.4, life: 1,
          vx: -(6 + Math.random() * 5), vy: 2.5 + Math.random() * 2 });
      }
      shooting = shooting.filter(s => s.life > 0);
      for (const s of shooting) {
        const gradient = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 12, s.y - s.vy * 12);
        gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
        gradient.addColorStop(1, 'rgba(196,181,253,0)');
        ctx.globalAlpha = s.life;
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x - s.vx * 12, s.y - s.vy * 12);
        ctx.stroke();
        s.x += s.vx; s.y += s.vy; s.life -= 0.014;
      }
      ctx.globalAlpha = 1;
      frame = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove);
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return <div className="cosmos" aria-hidden="true">
    <div className="nebula n1" /><div className="nebula n2" /><div className="nebula n3" />
    <svg className="orbits" viewBox="0 0 1000 1000" preserveAspectRatio="none">
      <ellipse cx="820" cy="120" rx="620" ry="240" transform="rotate(-14 820 120)" />
      <ellipse cx="200" cy="900" rx="700" ry="200" transform="rotate(-8 200 900)" />
      <ellipse cx="500" cy="520" rx="760" ry="330" transform="rotate(12 500 520)" />
    </svg>
    <canvas ref={canvasRef} />
  </div>;
}
