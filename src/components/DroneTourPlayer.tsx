
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface DroneTourPlayerProps {
    imageUrl: string;
    script: string;
    videoOperationName?: string;
    onClose: () => void;
}

const DroneTourPlayer: React.FC<DroneTourPlayerProps> = ({ imageUrl, script, videoOperationName, onClose }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isVideoProcessing, setIsVideoProcessing] = useState(!!videoOperationName);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Split script into words for subtitle rendering
    const words = script.split(' ');

    useEffect(() => {
        // Stop synthesis on unmount
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    // Polling for video
    useEffect(() => {
        if (!videoOperationName || videoUrl) return;

        let pollInterval: NodeJS.Timeout;

        const checkStatus = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) return;

                const res = await fetch(`/api/check-operation?operationName=${encodeURIComponent(videoOperationName)}`, {
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`
                    }
                });
                
                if (res.ok) {
                    const op = await res.json();
                    console.log("Polling video status:", op);
                    
                    if (op.done) {
                        // Video is ready
                        // The response format depends on the SDK. 
                        // Typically op.response.generated_videos[0].video.uri or similar
                        // Or op.result.generatedVideos...
                        
                        // Let's try to find the video URI in the response structure
                        // Based on Google Gen AI docs/examples
                        
                        // If result is in op.result
                        const result = op.result || op.response;
                        if (result && result.generatedVideos && result.generatedVideos.length > 0) {
                             const video = result.generatedVideos[0];
                             if (video.video && video.video.uri) {
                                 setVideoUrl(video.video.uri);
                                 setIsVideoProcessing(false);
                             } else if (video.videoUri) {
                                 setVideoUrl(video.videoUri);
                                 setIsVideoProcessing(false);
                             }
                        }
                    } else if (op.error) {
                        console.error("Video generation failed:", op.error);
                        setIsVideoProcessing(false);
                    }
                }
            } catch (e) {
                console.error("Error polling video:", e);
            }
        };

        // Poll every 5 seconds
        pollInterval = setInterval(checkStatus, 5000);
        checkStatus(); // Initial check

        return () => clearInterval(pollInterval);
    }, [videoOperationName, videoUrl]);

    const handlePlay = () => {
        if (isPlaying) return;
        setIsPlaying(true);

        // If we have a video, play it
        // Note: We sync audio with video if video is ready
        // But SpeechSynthesis is separate from video element. 
        // For simplicity, we'll play speech and let video loop or play alongside.
        
        const utterance = new SpeechSynthesisUtterance(script);
        utterance.lang = 'pt-BR';
        utterance.rate = 0.9;
        utterance.pitch = 0.9;
        utteranceRef.current = utterance;

        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                const charIndex = event.charIndex;
                // Find which word this character belongs to
                let currentLen = 0;
                for (let i = 0; i < words.length; i++) {
                    if (charIndex >= currentLen && charIndex < currentLen + words[i].length + 1) {
                        setCurrentWordIndex(i);
                        break;
                    }
                    currentLen += words[i].length + 1; // +1 for the space
                }
            }
        };

        utterance.onend = () => {
            setIsPlaying(false);
            setCurrentWordIndex(words.length);
        };

        window.speechSynthesis.speak(utterance);
    };
    
    // Auto-play video if it becomes available while playing
    useEffect(() => {
        if (videoUrl && isPlaying) {
             const videoEl = document.getElementById('tour-video') as HTMLVideoElement;
             if (videoEl) videoEl.play().catch(e => console.log("Auto-play failed", e));
        }
    }, [videoUrl, isPlaying]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">
            <button
                onClick={() => {
                    window.speechSynthesis.cancel();
                    onClose();
                }}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all z-50"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>

            <div className="relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-zinc-900 flex items-center justify-center">

                {/* Video or Ken Burns Image Container */}
                <div className="absolute inset-0 w-full h-full overflow-hidden">
                    {videoUrl ? (
                        <video
                            id="tour-video"
                            src={videoUrl}
                            className="w-full h-full object-cover"
                            loop
                            playsInline
                            muted // Muted because we use TTS for audio
                            autoPlay={isPlaying}
                        />
                    ) : (
                        <img
                            src={imageUrl}
                            alt="Drone Tour"
                            className={`w-full h-full object-cover transition-transform duration-[45s] ease-out ${isPlaying ? 'scale-150' : 'scale-100'}`}
                        />
                    )}
                </div>
                
                {/* Processing Indicator */}
                {isVideoProcessing && !videoUrl && (
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 z-20">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                        <span className="text-xs font-medium text-white">Gerando vídeo com Veo...</span>
                    </div>
                )}
                 
                 {videoUrl && (
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 z-20">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                        <span className="text-xs font-medium text-white">Vídeo Veo 3.1</span>
                    </div>
                )}

                {/* Play Overlay */}
                {!isPlaying && currentWordIndex === 0 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10 cursor-pointer" onClick={handlePlay}>
                        <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:scale-110 transition-transform">
                            <div className="w-0 h-0 border-y-[15px] border-y-transparent border-l-[25px] border-l-white ml-2"></div>
                        </div>
                    </div>
                )}

                {/* Dynamic Subtitles */}
                <div className="absolute bottom-12 left-0 right-0 px-8 flex justify-center z-20 pointer-events-none">
                    <p className="text-center w-full max-w-3xl leading-relaxed">
                        {words.map((word, i) => (
                            <span
                                key={i}
                                className={`inline-block mr-1.5 md:mr-2 lg:mr-3 transition-colors duration-200 text-2xl md:text-3xl lg:text-4xl font-semibold drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]
                  ${i === currentWordIndex
                                        ? 'text-white'
                                        : i < currentWordIndex
                                            ? 'text-white/40'
                                            : 'text-white/10'
                                    }`}
                            >
                                {word}
                            </span>
                        ))}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DroneTourPlayer;
