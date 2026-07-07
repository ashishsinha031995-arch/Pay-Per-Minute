import React, { useState, useEffect, useRef } from 'react';
import { X, Crop, Move, ZoomIn, Sliders, Check, User, ArrowLeft, RotateCw } from 'lucide-react';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentImage?: string;
  initialGender?: 'Male' | 'Female' | 'Other' | string;
  onSave: (croppedBase64: string) => Promise<void>;
}

const DEFAULT_AVATARS = {
  Male: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=256&q=80',
  Female: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
  Other: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
};

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  isOpen,
  onClose,
  currentImage,
  initialGender = 'Male',
  onSave
}) => {
  const [selectedGender, setSelectedGender] = useState<string>(initialGender);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isCustomUpload, setIsCustomUpload] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Editor states
  const [zoom, setZoom] = useState<number>(1.0);
  const [offsetX, setOffsetX] = useState<number>(0);
  const [offsetY, setOffsetY] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCircleRef = useRef<HTMLCanvasElement | null>(null);
  const previewSquareRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);

  // Load initial image or set default based on gender
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
        const genderKey = (selectedGender === 'Male' || selectedGender === 'Female' || selectedGender === 'Other')
          ? selectedGender
          : 'Male';
        setImageSrc(DEFAULT_AVATARS[genderKey as keyof typeof DEFAULT_AVATARS]);
        setIsCustomUpload(false);
      }
    }
  }, [isOpen, currentImage]);

  // If gender changes and it's NOT a custom upload, switch the default avatar
  useEffect(() => {
    if (!isCustomUpload && isOpen) {
      const genderKey = (selectedGender === 'Male' || selectedGender === 'Female' || selectedGender === 'Other')
        ? selectedGender
        : 'Male';
      setImageSrc(DEFAULT_AVATARS[genderKey as keyof typeof DEFAULT_AVATARS]);
      setImageLoaded(false);
      setZoom(1.0);
      setOffsetX(0);
      setOffsetY(0);
      setRotation(0);
    }
  }, [selectedGender, isCustomUpload]);

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
      const croppedBase64 = canvasRef.current.toDataURL('image/jpeg', 0.9);
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
              <h3 className="text-xs sm:text-sm font-bold text-slate-100 font-sans tracking-wide">Edit & Crop Profile Photo</h3>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono mt-0.5">Crop, resize & align your avatar</p>
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

          {/* Gender Selector for Default Avatar if not custom uploaded */}
          <div className="bg-slate-950/40 p-3 sm:p-4 rounded-2xl border border-slate-800/60 space-y-2.5 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Default Gender Avatar
              </label>
              {isCustomUpload && (
                <button
                  type="button"
                  onClick={() => setIsCustomUpload(false)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1 justify-start"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Reset to default gender</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {['Male', 'Female', 'Other'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSelectedGender(g)}
                  className={`px-2 sm:px-4 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center space-x-1 sm:space-x-2 border ${
                    selectedGender === g
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span>{g}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Core Interactive Editor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-stretch">
            
            {/* Visual Canvas Cropper Area */}
            <div className="flex flex-col items-center justify-center space-y-2 bg-slate-950/20 p-3 rounded-2xl border border-slate-800/30">
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800/80 flex items-center justify-center shadow-inner group">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full object-cover rounded-2xl"
                />
                
                {/* Crosshairs Overlay */}
                <div className="absolute inset-0 pointer-events-none border border-white/5 flex items-center justify-center rounded-2xl">
                  <div className="absolute inset-x-0 h-[1px] bg-white/10" />
                  <div className="absolute inset-y-0 w-[1px] bg-white/10" />
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-dashed border-indigo-500/30" />
                </div>
              </div>
              <span className="text-[9px] font-mono text-slate-500">Crop Area (256x256)</span>
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
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border border-indigo-500/20 overflow-hidden bg-slate-950 shadow-md">
                      <canvas
                        ref={previewCircleRef}
                        width={256}
                        height={256}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">Circular</span>
                  </div>

                  {/* Square Preview */}
                  <div className="flex flex-col items-center space-y-1">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl border border-indigo-500/20 overflow-hidden bg-slate-950 shadow-md">
                      <canvas
                        ref={previewSquareRef}
                        width={256}
                        height={256}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">Square</span>
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

          {/* Slider Options */}
          <div className="bg-slate-950/40 p-3 sm:p-4 rounded-2xl border border-slate-800/60 space-y-3.5 sm:space-y-4 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span>Adjustment Controls</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setZoom(1.0);
                  setOffsetX(0);
                  setOffsetY(0);
                  setRotation(0);
                }}
                className="text-[9px] font-mono text-slate-500 hover:text-indigo-400"
              >
                Reset All
              </button>
            </div>

            {/* Size / Zoom */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 text-[11px] sm:text-xs font-sans flex items-center space-x-1">
                  <ZoomIn className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Resize / Zoom</span>
                </span>
                <span className="text-slate-400 font-mono text-[9px] sm:text-[10px]">{zoom.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Alignment and offsets */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
              
              {/* Horizontal offset */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 text-[11px] sm:text-xs font-sans flex items-center space-x-1">
                    <Move className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Horizontal Shift</span>
                  </span>
                  <span className="text-slate-400 font-mono text-[9px] sm:text-[10px]">{offsetX}px</span>
                </div>
                <input
                  type="range"
                  min="-200"
                  max="200"
                  step="1"
                  value={offsetX}
                  onChange={(e) => setOffsetX(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

              {/* Vertical offset */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 text-[11px] sm:text-xs font-sans flex items-center space-x-1">
                    <Move className="w-3.5 h-3.5 text-indigo-400 rotate-90" />
                    <span>Vertical Shift</span>
                  </span>
                  <span className="text-slate-400 font-mono text-[9px] sm:text-[10px]">{offsetY}px</span>
                </div>
                <input
                  type="range"
                  min="-200"
                  max="200"
                  step="1"
                  value={offsetY}
                  onChange={(e) => setOffsetY(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
              </div>

            </div>

            {/* Rotation Control */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 text-[11px] sm:text-xs font-sans flex items-center space-x-1">
                  <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Rotate Image</span>
                </span>
                <span className="text-slate-400 font-mono text-[9px] sm:text-[10px]">{rotation}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="90"
                value={rotation}
                onChange={(e) => setRotation(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Quick alignment Presets */}
            <div className="space-y-3 pt-2.5 border-t border-slate-800/50 text-left">
              <span className="text-[9px] font-mono text-slate-500 block uppercase tracking-wider">
                Quick Align Presets
              </span>
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">Horizontal:</span>
                  <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => alignImage('left')}
                      className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-bold text-slate-300 transition-colors"
                    >
                      Left
                    </button>
                    <button
                      type="button"
                      onClick={() => alignImage('center')}
                      className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-bold text-slate-300 transition-colors"
                    >
                      Center
                    </button>
                    <button
                      type="button"
                      onClick={() => alignImage('right')}
                      className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-bold text-slate-300 transition-colors"
                    >
                      Right
                    </button>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">Vertical:</span>
                  <div className="grid grid-cols-3 gap-1.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => alignImage('top')}
                      className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-bold text-slate-300 transition-colors"
                    >
                      Top
                    </button>
                    <button
                      type="button"
                      onClick={() => alignImage('middle')}
                      className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-bold text-slate-300 transition-colors"
                    >
                      Center
                    </button>
                    <button
                      type="button"
                      onClick={() => alignImage('bottom')}
                      className="px-2.5 py-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded text-[10px] font-bold text-slate-300 transition-colors"
                    >
                      Bottom
                    </button>
                  </div>
                </div>
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
