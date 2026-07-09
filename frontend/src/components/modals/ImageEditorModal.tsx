import React, { useState, useEffect, useRef } from 'react';
import { X, Crop, Check } from 'lucide-react';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentImage?: string;
  initialGender?: 'Male' | 'Female' | 'Other' | string;
  onSave: (croppedBase64: string) => Promise<void>;
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80';

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  isOpen,
  onClose,
  currentImage,
  initialGender = 'Male',
  onSave
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isCustomUpload, setIsCustomUpload] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Editor states
  const [zoom, setZoom] = useState<number>(1.0);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0);
  const [cropShape, setCropShape] = useState<'circle' | 'square'>('circle');

  // Dragging and Pinch-to-zoom states
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [initialOffsets, setInitialOffsets] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const [isPinching, setIsPinching] = useState<boolean>(false);
  const [initialPinchDistance, setInitialPinchDistance] = useState<number>(0);
  const [initialPinchZoom, setInitialPinchZoom] = useState<number>(1.0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCircleRef = useRef<HTMLCanvasElement | null>(null);
  const previewSquareRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  // Helper to calculate distance between two fingers
  const getPinchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleStart = (clientX: number, clientY: number) => {
    if (!imageLoaded) return;
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
    setInitialOffsets({ x: offsetX, y: offsetY });
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || !imageLoaded) return;
    const dx = clientX - dragStart.x;
    const dy = clientY - dragStart.y;

    // Rotate the drag delta back by rotation so dragging is intuitive
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(-rad);
    const sin = Math.sin(-rad);

    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;

    setOffsetX(initialOffsets.x + rx);
    setOffsetY(initialOffsets.y + ry);
  };

  const handleEnd = () => {
    setIsDragging(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const handleMouseUpOrLeave = () => {
    handleEnd();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsPinching(false);
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      setIsPinching(true);
      const dist = getPinchDistance(e.touches);
      setInitialPinchDistance(dist);
      setInitialPinchZoom(zoom);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && !isPinching) {
      // Prevent scrolling the page while dragging the image inside the crop area
      if (e.cancelable) e.preventDefault();
      handleMove(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2 && isPinching) {
      if (e.cancelable) e.preventDefault();
      const dist = getPinchDistance(e.touches);
      if (initialPinchDistance > 0 && dist > 0) {
        const factor = dist / initialPinchDistance;
        const targetZoom = Math.min(3.0, Math.max(0.5, initialPinchZoom * factor));
        setZoom(Number(targetZoom.toFixed(2)));
      }
    }
  };

  const handleTouchEnd = () => {
    handleEnd();
    setIsPinching(false);
  };

  // Load initial image or set generic default avatar
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setZoom(1.0);
      setOffsetX(0);
      setOffsetY(0);
      setRotation(0);
      setImageLoaded(false);

      if (currentImage && currentImage.trim() !== '') {
        setImageSrc(currentImage);
        setIsCustomUpload(true);
      } else {
        setImageSrc(DEFAULT_AVATAR);
        setIsCustomUpload(false);
      }
    }
  }, [isOpen, currentImage]);

  // Load image object for canvas manipulation
  useEffect(() => {
    if (!imageSrc) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = () => {
      console.warn('Failed to load image with CORS anonymous. Retrying without crossOrigin.');
      // Fallback try without crossOrigin
      const fallbackImg = new Image();
      fallbackImg.onload = () => {
        imageRef.current = fallbackImg;
        setImageLoaded(true);
      };
      fallbackImg.onerror = () => {
        setError('Please use a valid image URL or upload from your local computer.');
      };
      fallbackImg.src = imageSrc;
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Draw the image onto the canvas in real time
  useEffect(() => {
    if (!imageLoaded || !imageRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = imageRef.current;
    const size = 256; // Output dimensions
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Save current context state
    ctx.save();

    // Translate to center to rotate/scale/translate correctly
    ctx.translate(size / 2, size / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    // Calculate source aspect ratio & fitting size
    const imgAspect = img.width / img.height;
    let drawWidth = size;
    let drawHeight = size;

    if (imgAspect > 1) {
      // Landscape: fit height, stretch width
      drawWidth = size * imgAspect;
    } else {
      // Portrait/Square: fit width, stretch height
      drawHeight = size / imgAspect;
    }

    // Apply scaling/zoom
    drawWidth *= zoom;
    drawHeight *= zoom;

    // Draw centering the image, plus user offsets
    ctx.drawImage(
      img,
      -drawWidth / 2 + offsetX,
      -drawHeight / 2 + offsetY,
      drawWidth,
      drawHeight
    );

    // Restore context
    ctx.restore();

    // Synchronize previews in real time
    if (previewCircleRef.current) {
      const pCtx = previewCircleRef.current.getContext('2d');
      if (pCtx) {
        pCtx.clearRect(0, 0, 256, 256);
        pCtx.drawImage(canvas, 0, 0, 256, 256);
      }
    }
    if (previewSquareRef.current) {
      const pCtx = previewSquareRef.current.getContext('2d');
      if (pCtx) {
        pCtx.clearRect(0, 0, 256, 256);
        pCtx.drawImage(canvas, 0, 0, 256, 256);
      }
    }
  }, [imageLoaded, zoom, offsetX, offsetY, rotation, imageSrc]);

  // File upload change handler
  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('File size is too large. Please upload an image smaller than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setIsCustomUpload(true);
      setImageLoaded(false);
      setZoom(1.0);
      setOffsetX(0);
      setOffsetY(0);
      setRotation(0);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  // Preset alignments
  const alignImage = (preset: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!imageLoaded || !imageRef.current) return;
    const img = imageRef.current;
    const size = 256;
    const imgAspect = img.width / img.height;

    let drawWidth = size;
    let drawHeight = size;

    if (imgAspect > 1) {
      drawWidth = size * imgAspect;
    } else {
      drawHeight = size / imgAspect;
    }

    drawWidth *= zoom;
    drawHeight *= zoom;

    const maxDeltaX = Math.max(0, (drawWidth - size) / 2);
    const maxDeltaY = Math.max(0, (drawHeight - size) / 2);

    switch (preset) {
      case 'left':
        setOffsetX(maxDeltaX);
        break;
      case 'right':
        setOffsetX(-maxDeltaX);
        break;
      case 'center':
        setOffsetX(0);
        break;
      case 'top':
        setOffsetY(maxDeltaY);
        break;
      case 'bottom':
        setOffsetY(-maxDeltaY);
        break;
      case 'middle':
        setOffsetY(0);
        break;
    }
  };

  const handleSave = async () => {
    if (!canvasRef.current || !imageLoaded) return;
    setLoading(true);
    setError(null);
    try {
      let croppedBase64 = '';
      if (cropShape === 'circle') {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 256;
        tempCanvas.height = 256;
        const tempCtx = tempCanvas.getContext('2d');
        if (tempCtx) {
          tempCtx.beginPath();
          tempCtx.arc(128, 128, 128, 0, 2 * Math.PI);
          tempCtx.clip();
          tempCtx.drawImage(canvasRef.current, 0, 0);
          croppedBase64 = tempCanvas.toDataURL('image/png');
        } else {
          croppedBase64 = canvasRef.current.toDataURL('image/jpeg', 0.9);
        }
      } else {
        croppedBase64 = canvasRef.current.toDataURL('image/jpeg', 0.9);
      }
      await onSave(croppedBase64);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Saving failed. Please check your image.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[100] p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800/80 rounded-3xl w-full max-w-lg md:max-w-xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-100 font-sans tracking-wide">Crop Section</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800/80 text-slate-400 hover:text-slate-100 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto max-h-[65vh] sm:max-h-[70vh]">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] p-3 rounded-2xl font-sans">
              ⚠️ {error}
            </div>
          )}

          {/* WhatsApp-Style Shape Selection Tabs */}
          <div className="flex items-center justify-center p-0.5 bg-slate-950/60 rounded-2xl border border-slate-800 max-w-[280px] mx-auto">
            <button
              type="button"
              onClick={() => setCropShape('circle')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center space-x-2 ${
                cropShape === 'circle'
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full border border-current" />
              <span>Circular Crop</span>
            </button>
            <button
              type="button"
              onClick={() => setCropShape('square')}
              className={`flex-1 py-1.5 px-3 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center space-x-2 ${
                cropShape === 'square'
                  ? 'bg-indigo-600 text-white shadow-md font-black'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2.5 h-2.5 border border-current" />
              <span>Square Crop</span>
            </button>
          </div>

          {/* Core Interactive Editor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-stretch">
            
            {/* Visual Canvas Cropper Area */}
            <div className="flex flex-col items-center justify-center space-y-2 bg-slate-950/20 p-3 rounded-2xl border border-slate-800/30">
              <div 
                className={`relative w-36 h-36 sm:w-44 sm:h-44 bg-slate-950 overflow-hidden border border-slate-800/80 flex items-center justify-center shadow-inner group select-none touch-none ${cropShape === 'circle' ? 'rounded-full' : 'rounded-2xl'} ${imageLoaded ? 'cursor-grab active:cursor-grabbing' : ''}`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                <canvas
                  ref={canvasRef}
                  className={`w-full h-full object-cover pointer-events-none ${cropShape === 'circle' ? 'rounded-full' : 'rounded-2xl'}`}
                />
                
                {/* Crosshairs & WhatsApp Mask Overlay */}
                {cropShape === 'circle' ? (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="absolute inset-x-0 h-[1px] bg-white/10" />
                    <div className="absolute inset-y-0 w-[1px] bg-white/10" />
                    {/* Perfect circle boundary that matches the 100% border layout */}
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.65)]" />
                  </div>
                ) : (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="absolute inset-x-0 h-[1px] bg-white/10" />
                    <div className="absolute inset-y-0 w-[1px] bg-white/10" />
                    {/* Perfect square boundary overlay with slight corner markers */}
                    <div className="absolute inset-0 border-2 border-dashed border-indigo-400 shadow-[0_0_0_9999px_rgba(15,23,42,0.4)]" />
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-4 border-l-4 border-indigo-400" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-4 border-r-4 border-indigo-400" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-4 border-l-4 border-indigo-400" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-4 border-r-4 border-indigo-400" />
                  </div>
                )}
              </div>
              <span className="text-[9px] font-mono text-slate-500">Crop Area (256x256)</span>
              {imageLoaded && (
                <p className="text-[10px] text-emerald-400 font-sans mt-1 text-center animate-pulse">
                  👆 Drag with 1 finger to move • Pinch with 2 fingers to Zoom!
                </p>
              )}
            </div>

            {/* Avatar Previews in Circle and Square */}
            <div className="bg-slate-950/30 p-3 sm:p-4 rounded-2xl border border-slate-800/50 space-y-3 flex flex-col justify-between text-left">
              <div>
                <h4 className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2.5">
                  Real-Time Previews
                </h4>
                <div className="flex items-center justify-start gap-5 sm:gap-6">
                  {/* Circular Preview */}
                  <div className="flex flex-col items-center space-y-1">
                    <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-slate-950 shadow-md transition-all ${cropShape === 'circle' ? 'border-2 border-emerald-400 scale-105' : 'border border-slate-800 opacity-60'}`}>
                      <canvas
                        ref={previewCircleRef}
                        width={256}
                        height={256}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className={`text-[9px] font-mono ${cropShape === 'circle' ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>Circular</span>
                  </div>

                  {/* Square Preview */}
                  <div className="flex flex-col items-center space-y-1">
                    <div className={`w-12 h-12 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-slate-950 shadow-md transition-all ${cropShape === 'square' ? 'border-2 border-indigo-400 scale-105' : 'border border-slate-800 opacity-60'}`}>
                      <canvas
                        ref={previewSquareRef}
                        width={256}
                        height={256}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className={`text-[9px] font-mono ${cropShape === 'square' ? 'text-indigo-400 font-bold' : 'text-slate-400'}`}>Square</span>
                  </div>
                </div>
              </div>

              {/* Upload alternative */}
              <div className="pt-2.5 border-t border-slate-800/50 mt-1">
                <input
                  type="file"
                  id="editor-file-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLocalFileChange}
                />
                <label
                  htmlFor="editor-file-upload"
                  className="inline-flex items-center space-x-1.5 text-[11px] sm:text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer transition-colors"
                >
                  <span>📁 Select another custom image</span>
                </label>
              </div>
            </div>

          </div>



        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-800/80 bg-slate-900/50 flex items-center justify-end space-x-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 sm:px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || !imageLoaded}
            onClick={handleSave}
            className="px-4 sm:px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-indigo-600/10"
          >
            {loading ? (
              <span>Saving Photo...</span>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Apply & Save Photo</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
