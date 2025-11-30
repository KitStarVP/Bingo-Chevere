import React, { useState } from 'react';
import { NicheType, ProjectState, ScriptSegment, GeneratedAsset } from './types';
import { generateViralScript, generateSegmentImage, generateSegmentAudio } from './services/geminiService';
import ShortsPlayer from './components/ShortsPlayer';
import { Wand2, Youtube, DollarSign, Image as ImageIcon, Music, Loader2, Sparkles, ArrowRight, LayoutTemplate } from 'lucide-react';

const App: React.FC = () => {
  const [state, setState] = useState<ProjectState>({
    topic: '',
    niche: NicheType.CURIOSITIES,
    isGeneratingScript: false,
    script: [],
    assets: {},
    currentStep: 'input',
  });

  const handleGenerateScript = async () => {
    if (!state.topic) return;
    
    setState(prev => ({ ...prev, isGeneratingScript: true }));
    try {
      const script = await generateViralScript(state.topic, state.niche);
      setState(prev => ({
        ...prev,
        script,
        isGeneratingScript: false,
        currentStep: 'script',
        // Initialize empty assets
        assets: script.reduce((acc, seg) => ({
          ...acc,
          [seg.id]: { segmentId: seg.id, isGeneratingImage: false, isGeneratingAudio: false }
        }), {})
      }));
    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, isGeneratingScript: false }));
      alert("Error generating script. Check API Key.");
    }
  };

  const handleGenerateAssets = async () => {
    setState(prev => ({ ...prev, currentStep: 'production' }));

    const newAssets = { ...state.assets };
    
    // Trigger generations in parallel for all segments
    await Promise.all(state.script.map(async (segment) => {
      // 1. Start Image Gen
      setState(prev => ({
        ...prev,
        assets: {
          ...prev.assets,
          [segment.id]: { ...prev.assets[segment.id], isGeneratingImage: true }
        }
      }));

      const imageUrl = await generateSegmentImage(segment.visualPrompt);
      
      setState(prev => ({
        ...prev,
        assets: {
          ...prev.assets,
          [segment.id]: { ...prev.assets[segment.id], isGeneratingImage: false, imageUrl: imageUrl || undefined }
        }
      }));

      // 2. Start Audio Gen
      setState(prev => ({
        ...prev,
        assets: {
          ...prev.assets,
          [segment.id]: { ...prev.assets[segment.id], isGeneratingAudio: true }
        }
      }));

      const audioBuffer = await generateSegmentAudio(segment.text);

      setState(prev => ({
        ...prev,
        assets: {
          ...prev.assets,
          [segment.id]: { ...prev.assets[segment.id], isGeneratingAudio: false, audioBuffer: audioBuffer || undefined }
        }
      }));
    }));

    setState(prev => ({ ...prev, currentStep: 'preview' }));
  };

  // --- Render Steps ---

  const renderInput = () => (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
      <div className="text-center space-y-4">
        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 pb-2">
          ViralShorts AI
        </h1>
        <p className="text-zinc-400 text-lg">
          Genera contenido monetizable para YouTube en segundos con Inteligencia Artificial.
        </p>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl shadow-xl backdrop-blur-sm">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Selecciona tu Nicho</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.values(NicheType).map((niche) => (
                <button
                  key={niche}
                  onClick={() => setState(s => ({ ...s, niche }))}
                  className={`p-3 rounded-lg text-left text-sm font-medium transition-all border ${
                    state.niche === niche 
                    ? 'bg-purple-900/30 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.3)]' 
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750'
                  }`}
                >
                  {niche}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Tema del Video</label>
            <input
              type="text"
              value={state.topic}
              onChange={(e) => setState(s => ({ ...s, topic: e.target.value }))}
              placeholder="Ej: Los secretos de las Pirámides, Cómo ganar dinero online..."
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-4 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <button
            onClick={handleGenerateScript}
            disabled={!state.topic || state.isGeneratingScript}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold text-white shadow-lg hover:shadow-purple-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {state.isGeneratingScript ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles className="animate-pulse" />
            )}
            {state.isGeneratingScript ? "Analizando Tendencias & Escribiendo..." : "Generar Guion Viral"}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-center text-zinc-500 text-xs uppercase tracking-wider">
        <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-zinc-900 rounded-full text-purple-400"><LayoutTemplate size={18} /></div>
            <span>Script Optimizado</span>
        </div>
        <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-zinc-900 rounded-full text-pink-400"><ImageIcon size={18} /></div>
            <span>Imágenes 9:16</span>
        </div>
        <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-zinc-900 rounded-full text-blue-400"><Music size={18} /></div>
            <span>Narración Realista</span>
        </div>
      </div>
    </div>
  );

  const renderScriptView = () => (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <LayoutTemplate className="text-purple-500" /> Guion Generado
        </h2>
        <button 
          onClick={handleGenerateAssets}
          className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-900/20"
        >
          Producir Short <ArrowRight size={18} />
        </button>
      </div>

      <div className="space-y-4">
        {state.script.map((seg) => (
          <div key={seg.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-xl hover:border-zinc-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                seg.role === 'hook' ? 'bg-red-500/20 text-red-400' :
                seg.role === 'cta' ? 'bg-green-500/20 text-green-400' :
                'bg-blue-500/20 text-blue-400'
              }`}>
                {seg.role}
              </span>
              <span className="text-zinc-500 text-xs">~{seg.durationEstimate}s</span>
            </div>
            <p className="text-lg text-white font-medium mb-4 leading-relaxed">"{seg.text}"</p>
            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
              <p className="text-xs text-zinc-500 font-mono mb-1">PROMPT VISUAL:</p>
              <p className="text-sm text-zinc-400 italic">{seg.visualPrompt}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProduction = () => {
    const total = state.script.length * 2; // Audio + Image per segment
    // Explicitly casting to avoid TS errors with 'unknown' type inference on reduce
    const assets = Object.values(state.assets) as GeneratedAsset[];
    const done = assets.reduce((acc: number, curr: GeneratedAsset) => {
        return acc + (curr.imageUrl ? 1 : 0) + (curr.audioBuffer ? 1 : 0);
    }, 0);
    const percent = Math.round((done / total) * 100) || 0; // Handle NaN if total is 0

    return (
      <div className="max-w-xl mx-auto text-center py-20 animate-fade-in">
        <div className="relative w-32 h-32 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
            <div 
                className="absolute inset-0 border-4 border-purple-500 rounded-full transition-all duration-500"
                style={{ clipPath: `inset(${100 - percent}% 0 0 0)` }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">{percent}%</span>
            </div>
        </div>
        <h2 className="text-3xl font-bold mb-4">Produciendo Contenido...</h2>
        <p className="text-zinc-400 mb-8">Nuestra IA está generando imágenes de alta definición y sintetizando la voz para tu video.</p>
        
        <div className="grid grid-cols-1 gap-3 text-left max-w-sm mx-auto">
            {state.script.map(seg => {
                const asset = state.assets[seg.id];
                return (
                    <div key={seg.id} className="flex items-center gap-3 text-sm text-zinc-500 bg-zinc-900 p-2 rounded-lg">
                        <div className={`w-2 h-2 rounded-full ${asset.imageUrl && asset.audioBuffer ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                        <span className="truncate flex-1">Escena {seg.id + 1}: {seg.role}</span>
                        <div className="flex gap-2">
                             <ImageIcon size={14} className={asset.imageUrl ? "text-purple-400" : "text-zinc-700"} />
                             <Music size={14} className={asset.audioBuffer ? "text-blue-400" : "text-zinc-700"} />
                        </div>
                    </div>
                )
            })}
        </div>
      </div>
    );
  }

  const renderPreview = () => (
    <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto animate-fade-in h-[calc(100vh-100px)]">
      {/* Left Column: Player */}
      <div className="flex-1 flex items-center justify-center bg-zinc-900/30 rounded-3xl p-8 border border-zinc-800">
        <div className="w-full max-w-[350px]">
            <ShortsPlayer script={state.script} assets={state.assets} />
        </div>
      </div>

      {/* Right Column: Details & Actions */}
      <div className="flex-1 flex flex-col justify-center space-y-8">
        <div>
            <h2 className="text-4xl font-bold mb-2">¡Tu Short está listo! 🚀</h2>
            <p className="text-zinc-400 text-lg">Revisa el contenido antes de subirlo. Este video está optimizado para retención.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                <div className="text-zinc-500 text-sm mb-1">Nichos Compatibles</div>
                <div className="text-white font-semibold">{state.niche}</div>
            </div>
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
                <div className="text-zinc-500 text-sm mb-1">Duración Est.</div>
                <div className="text-white font-semibold">~{state.script.reduce((a,b) => a + b.durationEstimate, 0)} segundos</div>
            </div>
        </div>

        <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/20 border border-green-800/50 p-6 rounded-2xl">
            <h3 className="text-green-400 font-bold flex items-center gap-2 mb-2">
                <DollarSign size={20} /> Potencial de Monetización
            </h3>
            <p className="text-sm text-green-200/80">
                Este guion utiliza un gancho de alto impacto (Hook) y mantiene un ritmo rápido para maximizar el "Average View Duration" (AVD), métrica clave para el algoritmo de Shorts.
            </p>
        </div>

        <div className="flex gap-4">
            <button 
                onClick={() => setState(prev => ({ ...prev, currentStep: 'input', topic: '' }))}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-colors"
            >
                Crear Nuevo
            </button>
            <button 
                className="flex-1 py-3 bg-white text-black hover:bg-zinc-200 rounded-xl font-bold transition-colors shadow-lg flex justify-center items-center gap-2"
                onClick={() => alert("En una app real, esto combinaría las imágenes y el audio usando FFmpeg en el backend para descargar un .mp4")}
            >
                <Youtube size={20} />
                Descargar MP4
            </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-purple-500/30">
      {/* Header */}
      <nav className="border-b border-zinc-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Wand2 size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">ViralShorts<span className="text-purple-500">.AI</span></span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-zinc-400">
            <span className="hover:text-white cursor-pointer transition-colors">Tendencias</span>
            <span className="hover:text-white cursor-pointer transition-colors">Mis Proyectos</span>
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700"></div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {state.currentStep === 'input' && renderInput()}
        {state.currentStep === 'script' && renderScriptView()}
        {state.currentStep === 'production' && renderProduction()}
        {state.currentStep === 'preview' && renderPreview()}
      </main>
    </div>
  );
};

export default App;