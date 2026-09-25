import React, { useEffect, useRef, useState } from 'react';

const VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260530_042513_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4';

export function Background({ visible }: { visible: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = video.current;
    if (!el || !visible || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let prevX: number | undefined, targetTime = 0, seeking = false;
    function seek() {
      if (!el || seeking || !Number.isFinite(el.duration) || Math.abs(el.currentTime - targetTime) < .035) return;
      seeking = true;
      el.currentTime = Math.min(targetTime, Math.max(0, el.duration - .05));
    }
    const onMove = (event: MouseEvent) => {
      if (prevX === undefined) { prevX = event.clientX; return; }
      const delta = event.clientX - prevX;
      prevX = event.clientX;
      if (!Number.isFinite(el.duration)) return;
      targetTime = Math.max(0, Math.min(el.duration - .05, targetTime + delta / window.innerWidth * .8 * el.duration));
      seek();
    };
    const onSeeked = () => { seeking = false; seek(); };
    window.addEventListener('mousemove', onMove);
    el.addEventListener('seeked', onSeeked);
    return () => {
      window.removeEventListener('mousemove', onMove);
      el.removeEventListener('seeked', onSeeked);
    };
  }, [visible]);

  return (
    <div className={`scene ${visible ? '' : 'scene-hidden'}`} aria-hidden="true">
      <div className="scene-fallback" />
      {!failed && <video ref={video} src={VIDEO} muted playsInline preload="auto" onError={() => setFailed(true)} />}
      <div className="scene-wash" />
    </div>
  );
}
