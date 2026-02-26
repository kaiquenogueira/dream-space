
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface DroneTourPlayerProps {
    imageUrl: string;
    videoOperationName?: string;
    initialVideoUrl?: string | null;
    onVideoGenerated?: (url: string) => void;
    onClose: () => void;
}

const MAX_RETRIES = 60; // 60 * 3s = 3 minutes timeout
const POLL_INTERVAL_MS = 3000;

const DroneTourPlayer: React.FC<DroneTourPlayerProps> = ({ imageUrl, videoOperationName, initialVideoUrl, onVideoGenerated, onClose }) => {
    const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl || null);
    const [isVideoProcessing, setIsVideoProcessing] = useState(!!videoOperationName && !initialVideoUrl);
    const [error, setError] = useState<string | null>(null);
    const retryCountRef = useRef(0);
    const isFetchingRef = useRef(false);
    const blobUrlRef = useRef<string | null>(null);
    const getApiUrl = (path: string) => {
        const base = import.meta.env.VITE_API_BASE_URL;
        if (!base) return path;
        const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${normalizedBase}${normalizedPath}`;
    };
    const resolveApiUrl = (path: string) => (path.startsWith('/api/') ? getApiUrl(path) : path);

    const fetchVideoBlob = async (sourceUrl: string) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        setIsVideoProcessing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError("Sessão expirada. Faça login novamente.");
                return;
            }

            const res = await fetch(resolveApiUrl(sourceUrl), {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (!res.ok) {
                setError("Falha ao carregar o vídeo.");
                return;
            }

            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current);
            }
            blobUrlRef.current = objectUrl;
            setVideoUrl(objectUrl);
        } catch (fetchError) {
            setError("Falha ao carregar o vídeo.");
        } finally {
            setIsVideoProcessing(false);
            isFetchingRef.current = false;
        }
    };

    useEffect(() => {
        if (videoUrl && videoUrl.startsWith('/api/media-proxy')) {
            fetchVideoBlob(videoUrl);
        }
    }, [videoUrl]);

    useEffect(() => {
        return () => {
            if (blobUrlRef.current) {
                URL.revokeObjectURL(blobUrlRef.current);
            }
        };
    }, []);

    // Polling for video
    useEffect(() => {
        if (!videoOperationName || videoUrl || error) return;

        const checkStatus = async () => {
            if (retryCountRef.current >= MAX_RETRIES) {
                setError("O tempo limite de geração foi excedido. Por favor, tente novamente.");
                setIsVideoProcessing(false);
                return;
            }

            retryCountRef.current += 1;

            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setError("Sessão expirada. Faça login novamente.");
                    return;
                }

                const res = await fetch(getApiUrl(`/api/check-operation?operationName=${encodeURIComponent(videoOperationName)}`), {
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`
                    }
                });

                if (res.ok) {
                    const op = await res.json();
                    console.log(`Polling video status (${retryCountRef.current}/${MAX_RETRIES}):`, op.done ? "Done" : "Pending");

                    if (op.error) {
                        console.error("Video generation failed:", op.error);
                        setError(`Falha na geração: ${op.error.message || 'Erro desconhecido'}`);
                        setIsVideoProcessing(false);
                    } else if (op.done) {
                        const result = op.result || op.response;
                        if (result && result.generatedVideos && result.generatedVideos.length > 0) {
                            const video = result.generatedVideos[0];
                            const finalUrl = video.video?.uri || video.videoUri;

                            if (finalUrl) {
                                setVideoUrl(finalUrl);
                                setIsVideoProcessing(false);
                                onVideoGenerated?.(finalUrl);
                            } else {
                                setError("Vídeo gerado mas URL não encontrada.");
                                setIsVideoProcessing(false);
                            }
                        } else {
                            // Sometimes done but empty result means filtered or error
                            setError("A geração foi concluída sem resultados (possível filtro de conteúdo).");
                            setIsVideoProcessing(false);
                        }
                    }
                } else {
                    // Transient error, keep retrying until max

                }
            } catch (e) {
                console.error("Error polling video:", e);
                // Don't set error immediately on network glitch, just retry
            }
        };

        // Poll every 3 seconds for faster updates
        const pollInterval: NodeJS.Timeout = setInterval(checkStatus, POLL_INTERVAL_MS);
        checkStatus(); // Initial check

        return () => clearInterval(pollInterval);
    }, [videoOperationName, videoUrl, onVideoGenerated, error]);

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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
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

            <div className="w-full max-w-5xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl relative">
                {isVideoProcessing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10">
                        <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                        <p className="text-lg font-light tracking-wider animate-pulse">GERANDO CINEMATIC TOUR...</p>
                        <p className="text-sm text-white/50 mt-2">Isso pode levar de 1 a 2 minutos</p>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-10 bg-black/80">
                        <div className="text-red-500 mb-4">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                        </div>
                        <p className="text-lg text-center px-4">{error}</p>
                        <button
                            onClick={onClose}
                            className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm transition-all"
                        >
                            Fechar
                        </button>
                    </div>
                )}

                {videoUrl && (
                    <video
                        src={videoUrl}
                        className="w-full h-full object-contain"
                        controls
                        autoPlay
                        loop
                        playsInline
                    />
                )}

                {!videoUrl && !isVideoProcessing && !error && (
                    <img src={imageUrl} className="w-full h-full object-contain opacity-50" alt="Original" />
                )}
            </div>
        </div>
    );
};

export default DroneTourPlayer;
