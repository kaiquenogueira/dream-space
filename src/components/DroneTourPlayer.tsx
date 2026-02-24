
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface DroneTourPlayerProps {
    imageUrl: string;
    videoOperationName?: string;
    initialVideoUrl?: string | null;
    onVideoGenerated?: (url: string) => void;
    onClose: () => void;
}

const DroneTourPlayer: React.FC<DroneTourPlayerProps> = ({ imageUrl, videoOperationName, initialVideoUrl, onVideoGenerated, onClose }) => {
    const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl || null);
    const [isVideoProcessing, setIsVideoProcessing] = useState(!!videoOperationName && !initialVideoUrl);

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
                        const result = op.result || op.response;
                        if (result && result.generatedVideos && result.generatedVideos.length > 0) {
                             const video = result.generatedVideos[0];
                             if (video.video && video.video.uri) {
                                 setVideoUrl(video.video.uri);
                                setIsVideoProcessing(false);
                                onVideoGenerated?.(video.video.uri);
                             } else if (video.videoUri) {
                                setVideoUrl(video.videoUri);
                                setIsVideoProcessing(false);
                                onVideoGenerated?.(video.videoUri);
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

        // Poll every 3 seconds for faster updates
        pollInterval = setInterval(checkStatus, 3000);
        checkStatus(); // Initial check

        return () => clearInterval(pollInterval);
    }, [videoOperationName, videoUrl, onVideoGenerated]);

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!videoUrl) return;
        const link = document.createElement('a');
        link.href = videoUrl;
        link.download = `drone-tour-${Date.now()}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md">
            <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
                {videoUrl && (
                    <button
                        onClick={handleDownload}
                        className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
                        title="Baixar Vídeo"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </button>
                )}
                <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            <div className="relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-zinc-900 flex items-center justify-center">

                {/* Video or Image Container */}
                <div className="absolute inset-0 w-full h-full overflow-hidden">
                    {videoUrl ? (
                        <video
                            id="tour-video"
                            src={videoUrl}
                            className="w-full h-full object-cover"
                            loop
                            playsInline
                            controls
                            autoPlay
                        />
                    ) : (
                        <div className="relative w-full h-full">
                            <img
                                src={imageUrl}
                                alt="Drone Tour Preview"
                                className="w-full h-full object-cover opacity-50"
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <div className="w-16 h-16 rounded-full border-4 border-amber-500/30 border-t-amber-500 animate-spin mb-4"></div>
                                <p className="text-xl font-medium text-white">Gerando seu vídeo...</p>
                                <p className="text-sm text-zinc-400 mt-2">Isso pode levar cerca de 1 minuto</p>
                            </div>
                        </div>
                    )}
                </div>
                
                 {videoUrl && (
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg flex items-center gap-2 z-20 pointer-events-none">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                        <span className="text-xs font-medium text-white">Vídeo Gerado com IA</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DroneTourPlayer;
