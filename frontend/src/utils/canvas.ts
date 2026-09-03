import type { DetectedObject, VisionMode } from '../types/vision';

// In-memory trail history per tracklet ID: { [trackId]: Array<{x, y}> }
const trailHistoryStore = new Map<string | number, { x: number; y: number }[]>();
const MAX_TRAIL_LENGTH = 12;

/**
 * Synchronizes HTML5 Canvas size to video element dimensions
 */
export function syncCanvasSize(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): { width: number; height: number } | null {
  if (!video || !canvas) return null;

  const width = video.videoWidth || video.clientWidth;
  const height = video.videoHeight || video.clientHeight;

  if (width > 0 && height > 0) {
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    return { width, height };
  }
  return null;
}

export function clearCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

export function clearTrackingTrails() {
  trailHistoryStore.clear();
}

/**
 * Draws HUD reticle overlay
 */
export function drawTargetReticle(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height } = canvas;
  const centerX = width / 2;
  const centerY = height / 2;
  const reticleSize = Math.min(width, height) * 0.12;

  ctx.save();
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
  ctx.lineWidth = 1.5;

  // Center crosshairs
  ctx.beginPath();
  ctx.moveTo(centerX - reticleSize, centerY);
  ctx.lineTo(centerX + reticleSize, centerY);
  ctx.moveTo(centerX, centerY - reticleSize);
  ctx.lineTo(centerX, centerY + reticleSize);
  ctx.stroke();

  // Corner brackets
  const bracketLen = 20;
  const margin = 30;

  ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
  ctx.lineWidth = 2;

  // Top-left
  ctx.beginPath();
  ctx.moveTo(margin, margin + bracketLen);
  ctx.lineTo(margin, margin);
  ctx.lineTo(margin + bracketLen, margin);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(width - margin - bracketLen, margin);
  ctx.lineTo(width - margin, margin);
  ctx.lineTo(width - margin, margin + bracketLen);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(margin, height - margin - bracketLen);
  ctx.lineTo(margin, height - margin);
  ctx.lineTo(margin + bracketLen, height - margin);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(width - margin - bracketLen, height - margin);
  ctx.lineTo(width - margin, height - margin);
  ctx.lineTo(width - margin, height - margin - bracketLen);
  ctx.stroke();

  ctx.restore();
}

/**
 * Renders real-time AI overlays, tracking trails, masks, depth, and distance tags based on VisionMode
 */
export function drawDetections(
  canvas: HTMLCanvasElement,
  detections: DetectedObject[],
  imageWidth: number,
  imageHeight: number,
  visionMode: VisionMode = 'composite'
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  clearCanvas(canvas);
  drawTargetReticle(canvas);

  if (visionMode === 'normal') return;
  if (!detections || detections.length === 0 || imageWidth <= 0 || imageHeight <= 0) return;

  const scaleX = canvas.width / imageWidth;
  const scaleY = canvas.height / imageHeight;

  ctx.save();

  // Active track IDs set to prune stale trails
  const currentTrackIds = new Set<string | number>();

  // Step 1: Update & Render ByteTrack Persistent Trails
  detections.forEach((item) => {
    if (item.id !== undefined && item.id !== null) {
      currentTrackIds.add(item.id);
      const centerX = (item.bbox.x + item.bbox.width / 2) * scaleX;
      const centerY = (item.bbox.y + item.bbox.height / 2) * scaleY;

      if (!trailHistoryStore.has(item.id)) {
        trailHistoryStore.set(item.id, []);
      }
      const history = trailHistoryStore.get(item.id)!;
      history.push({ x: centerX, y: centerY });
      if (history.length > MAX_TRAIL_LENGTH) {
        history.shift();
      }

      // Render fading cyan trail line if mode allows
      if (visionMode === 'composite' || visionMode === 'detection') {
        if (history.length > 1) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(history[0].x, history[0].y);
          for (let i = 1; i < history.length; i++) {
            ctx.lineTo(history[i].x, history[i].y);
          }
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.45)';
          ctx.lineWidth = 2.0;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  });

  // Prune stale trail entries
  for (const tid of Array.from(trailHistoryStore.keys())) {
    if (!currentTrackIds.has(tid)) {
      trailHistoryStore.delete(tid);
    }
  }

  // Step 2: Render Object Detections / Masks / Depth / Distance per object
  detections.forEach((item) => {
    const { x, y, width: bWidth, height: bHeight } = item.bbox;
    const renderX = x * scaleX;
    const renderY = y * scaleY;
    const renderW = bWidth * scaleX;
    const renderH = bHeight * scaleY;

    // SAM Segmentation Mask Polygon
    if (
      (visionMode === 'segmentation' || visionMode === 'composite') &&
      item.mask &&
      item.mask.points &&
      item.mask.points.length > 2
    ) {
      ctx.save();
      ctx.beginPath();
      const firstPt = item.mask.points[0];
      ctx.moveTo(firstPt[0] * scaleX, firstPt[1] * scaleY);

      for (let i = 1; i < item.mask.points.length; i++) {
        const pt = item.mask.points[i];
        ctx.lineTo(pt[0] * scaleX, pt[1] * scaleY);
      }
      ctx.closePath();

      ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.fill();

      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();
    }

    // Bounding Box
    ctx.strokeStyle = visionMode === 'depth' ? '#a855f7' : '#00f0ff';
      ctx.lineWidth = 2.2;
      ctx.shadowColor = visionMode === 'depth' ? '#a855f7' : '#00f0ff';
      ctx.shadowBlur = 8;
      ctx.strokeRect(renderX, renderY, renderW, renderH);

      // Corner accent ticks
      const tickLen = Math.min(renderW, renderH, 10);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(renderX, renderY + tickLen);
      ctx.lineTo(renderX, renderY);
      ctx.lineTo(renderX + tickLen, renderY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(renderX + renderW - tickLen, renderY);
      ctx.lineTo(renderX + renderW, renderY);
      ctx.lineTo(renderX + renderW, renderY + tickLen);
      ctx.stroke();

    // Label Construction based on VisionMode
    const confPercent = Math.round(item.confidence * 100);
    const labelCap = item.label.charAt(0).toUpperCase() + item.label.slice(1);
    const idTag = item.id !== undefined && item.id !== null ? ` #${item.id}` : '';

    let labelText = `${labelCap}${idTag}`;

    if (visionMode === 'detection' || visionMode === 'composite') {
      labelText += ` (${confPercent}%)`;
    }

    if ((visionMode === 'distance' || visionMode === 'composite') && item.distance?.meters) {
      let distStr = ` • ≈ ${item.distance.meters.toFixed(1)} m`;
      labelText += distStr;
    } else if (
      visionMode === 'depth' &&
      item.relative_depth !== undefined &&
      item.relative_depth !== null
    ) {
      labelText += ` • Depth: ${item.relative_depth.toFixed(2)}`;
    }

    // Measure label width & position
    ctx.font = 'bold 12px Inter, system-ui, sans-serif';
    const textMetrics = ctx.measureText(labelText);
    const tagHeight = 24;
    const tagWidth = textMetrics.width + 18;
    const tagX = renderX;
    const tagY = Math.max(0, renderY - tagHeight - 2);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(10, 15, 30, 0.92)';
    ctx.fillRect(tagX, tagY, tagWidth, tagHeight);

    ctx.fillStyle = visionMode === 'depth' ? '#a855f7' : '#00f0ff';
    ctx.fillRect(tagX, tagY, tagWidth, 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(labelText, tagX + 9, tagY + 16);

    // Distance quality indicator line for 'distance' or 'composite' mode
    if ((visionMode === 'distance' || visionMode === 'composite') && item.distance) {
      const qColor =
        item.distance.quality === 'good'
          ? '#10b981'
          : item.distance.quality === 'moderate'
          ? '#f59e0b'
          : '#ef4444';

      ctx.save();
      ctx.beginPath();
      ctx.arc(renderX + renderW / 2, renderY + renderH / 2, 4, 0, 2 * Math.PI);
      ctx.fillStyle = qColor;
      ctx.fill();
      ctx.restore();
    }
  });

  ctx.restore();
}
