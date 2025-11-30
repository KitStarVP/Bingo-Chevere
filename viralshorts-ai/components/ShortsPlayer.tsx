import React, { useEffect, useRef, useState } from 'react';
import { GeneratedAsset, ScriptSegment } from '../types';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface ShortsPlayerProps {
  script: ScriptSegment[];
  assets: Record<number, GeneratedAsset>;
}

const ShortsPlayer: React.FC<ShortsPlayerProps> = ({ script, assets }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [progress, setProgress] = useState(0); // 0 to 100 for the current segment

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);

  // Initialize AudioContext
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    return () => {
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const stopCurrentAudio = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch (e) {
        // Ignore error if already stopped
      }
      sourceNodeRef.current = null;
    }
  };

  const playSegment = (index: number) => {
    if (index >= script.length) {
      setIsPlaying(false);
      setCurrentSegmentIndex(0);
      setProgress(0);
      return;
    }

    const asset = assets[index];
    if (!asset || !asset.audioBuffer) {
      // If no audio, skip to next after a delay (mocking duration)
      console.warn(`No audio for segment ${index}`);
      setTimeout(() => playSegment(index + 1), 2000);
      return;
    }

    stopCurrentAudio();
    setCurrentSegmentIndex(index);

    const ctx = audioContextRef.current;
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const source = ctx.createBufferSource();
    source.buffer = asset.audioBuffer;
    source.connect(ctx.destination);
    
    source.onended = () => {
      playSegment(index + 1);
    };

    sourceNodeRef.current = source;
    startTimeRef.current = ctx.currentTime;
    source.start();

    // Animation loop for progress bar
    const updateProgress = () => {
      const elapsed = ctx.currentTime - startTimeRef.current;
      const duration = asset.audioBuffer!.duration;
      const p = Math.min((elapsed / duration) * 100, 100);
      setProgress(p);

      if (p < 100 && isPlaying) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };
    
    // Check global isPlaying before starting animation loop
    // We set it true here because we just started a segment
    if (isPlaying) { 
        cancelAnimationFrame(animationFrameRef.current);
        updateProgress();
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      stopCurrentAudio();
      setIsPlaying(false);
      cancelAnimationFrame(animationFrameRef.current);
    } else {
      setIsPlaying(true);
      playSegment(currentSegmentIndex);
    }
  };

  const reset = () => {
    stopCurrentAudio();
    setIsPlaying(false);
    setCurrentSegmentIndex(0);
    setProgress(0);
    cancelAnimationFrame(animationFrameRef.current);
  };
  
  // Update animation loop status when isPlaying changes
  useEffect(() => {
      if(isPlaying && sourceNodeRef.current) {
         // resume progress tracking if we were paused? 
         // For simplicity, this basic player restarts the current segment or continues if handled nicely.
         // Given the complexity of resuming audio buffers exactly where left off without extensive code, 
         // we will just restart the current segment on Play.
         playSegment(currentSegmentIndex);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  const currentAsset = assets[currentSegmentIndex];
  const currentText = script[currentSegmentIndex]?.text;

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-sm mx-auto bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 relative aspect-[9/16]">
      {/* Video Display Area */}
      <div className="absolute inset-0 bg-zinc-900 flex items-center justify-center">
        {currentAsset?.imageUrl ? (
          <img 
            src={currentAsset.imageUrl} 
            alt="Scene" 
            className="w-full h-full object-cover animate-fade-in"
          />
        ) : (
          <div className="flex flex-col items-center p-6 text-center animate-pulse">
            <span className="text-4xl mb-4">🎬</span>
            <p className="text-zinc-500 text-sm font-medium">
              {currentAsset?.isGeneratingImage ? "Generando visuales con IA..." : "Esperando generación..."}
            </p>
          </div>
        )}
        
        {/* Caption Overlay */}
        <div className="absolute bottom-20 left-4 right-4 text-center">
            <div className="inline-block bg-black/60 backdrop-blur-md px-4 py-2 rounded-lg">
                <p className="text-white font-bold text-shadow-sm text-lg leading-tight">
                    {currentText}
                </p>
            </div>
        </div>
      </div>

      {/* Progress Bar (Segment level) */}
      <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800 z-20 flex">
          {script.map((seg, idx) => (
             <div key={seg.id} className="h-full flex-1 mx-0.5 bg-zinc-700 relative overflow-hidden rounded-full">
                 <div 
                    className={`absolute top-0 left-0 h-full bg-white transition-all duration-100 ease-linear`}
                    style={{ 
                        width: idx < currentSegmentIndex ? '100%' : (idx === currentSegmentIndex ? `${progress}%` : '0%') 
                    }}
                 />
             </div> 
          ))}
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 z-20 flex gap-4">
        <button 
          onClick={reset}
          className="p-3 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full text-white transition-colors"
        >
          <RotateCcw size={20} />
        </button>
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="p-4 bg-red-600 hover:bg-red-500 rounded-full text-white shadow-lg shadow-red-600/50 transition-all transform hover:scale-105 active:scale-95"
        >
          {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
        </button>
      </div>
    </div>
  );
};

export default ShortsPlayer;