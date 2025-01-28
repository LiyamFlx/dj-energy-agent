import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Square,
  Music2,
  AlertCircle,
  Loader,
  Zap,
  Volume2,
  Radio,
} from 'lucide-react';

class AudioAnalyzer {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
  }

  async initialize() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    return this;
  }

  async connectToInput(stream) {
    this.source = this.audioContext.createMediaStreamSource(stream);
    this.source.connect(this.analyser);
    return this;
  }

  getAudioData() {
    if (!this.analyser) return { waveform: [], frequency: [] };
    
    this.analyser.getByteTimeDomainData(this.dataArray);
    return Array.from(this.dataArray);
  }

  disconnect() {
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState('ready');
  const [errorMessage, setErrorMessage] = useState('');
  
  const analyzerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const canvasRef = useRef(null);

  const startMixing = async () => {
    try {
      setStatus('connecting');
      setErrorMessage('');

      if (!analyzerRef.current) {
        analyzerRef.current = await new AudioAnalyzer().initialize();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });

      await analyzerRef.current.connectToInput(stream);
      setIsPlaying(true);
      setStatus('live');
      updateVisualization();

    } catch (error) {
      setStatus('error');
      setErrorMessage('Could not access audio input. Please check your microphone.');
      setIsPlaying(false);
    }
  };

  const stopMixing = () => {
    setIsPlaying(false);
    setStatus('ready');
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (analyzerRef.current) {
      analyzerRef.current.disconnect();
      analyzerRef.current = null;
    }
  };

  const drawWaveform = (ctx, data, width, height) => {
    ctx.beginPath();
    ctx.strokeStyle = 'rgb(59, 130, 246)';
    ctx.lineWidth = 2;
    
    const sliceWidth = width / data.length;
    let x = 0;

    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);

      x += sliceWidth;
    }

    ctx.lineTo(width, height / 2);
    ctx.stroke();
  };

  const updateVisualization = () => {
    if (!analyzerRef.current || !isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const audioData = analyzerRef.current.getAudioData();
    drawWaveform(ctx, audioData, width, height);

    animationFrameRef.current = requestAnimationFrame(updateVisualization);
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (analyzerRef.current) {
        analyzerRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gray-900 rounded-lg border border-gray-800">
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-2 text-white font-bold">
              <Zap className="w-6 h-6 text-blue-400" />
              DJ Energy Agent
            </div>
            <div className="flex items-center gap-2">
              <span className={`flex items-center gap-2 text-sm px-3 py-1 rounded-full ${
                status === 'live' ? 'bg-blue-500/20 text-blue-400' :
                status === 'connecting' ? 'bg-yellow-500/20 text-yellow-400' :
                status === 'error' ? 'bg-red-500/20 text-red-400' :
                'bg-gray-500/20 text-gray-400'
              }`}>
                {status === 'live' ? (
                  <>
                    <Radio className="w-4 h-4 animate-pulse" />
                    LIVE
                  </>
                ) : status === 'connecting' ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : status === 'error' ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Error
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    Ready
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="p-6">
            {/* Visualization Canvas */}
            <div className="mb-6 bg-black rounded-lg overflow-hidden border border-gray-800">
              <canvas 
                ref={canvasRef}
                className="w-full h-40"
                width={800}
                height={160}
              />
            </div>

            {/* Controls */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={startMixing}
                disabled={isPlaying}
                className={`p-4 rounded-lg flex items-center justify-center gap-2 text-white font-medium transition-all
                  ${isPlaying 
                    ? 'bg-gray-800 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {status === 'connecting' ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                {status === 'connecting' ? 'Connecting...' : 'Start Mix'}
              </button>

              <button
                onClick={stopMixing}
                disabled={!isPlaying}
                className={`p-4 rounded-lg flex items-center justify-center gap-2 text-white font-medium transition-all
                  ${!isPlaying 
                    ? 'bg-gray-800 cursor-not-allowed' 
                    : 'bg-gray-700 hover:bg-gray-600'}`}
              >
                <Square className="w-5 h-5" />
                Stop Mix
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-400 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                {errorMessage}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
