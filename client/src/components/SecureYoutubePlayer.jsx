import { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize, 
  Loader2 
} from 'lucide-react';

// Loader helper for YouTube Iframe Player API
const loadYoutubeAPI = (callback) => {
  if (window.YT && window.YT.Player) {
    callback();
    return;
  }
  
  if (document.getElementById('youtube-iframe-api')) {
    const interval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(interval);
        callback();
      }
    }, 100);
    return;
  }

  const tag = document.createElement('script');
  tag.id = 'youtube-iframe-api';
  tag.src = 'https://www.youtube.com/iframe_api';
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

  const interval = setInterval(() => {
    if (window.YT && window.YT.Player) {
      clearInterval(interval);
      callback();
    }
  }, 100);
};

export default function SecureYoutubePlayer({ 
  youtubeId, 
  watermarkText, 
  watermarkIp, 
  watermarkPos 
}) {
  const playerIdRef = useRef(`secure-yt-${Math.random().toString(36).substr(2, 9)}`);
  const playerContainerRef = useRef(null);
  const progressBarRef = useRef(null);
  const mouseTimer = useRef(null);

  const [player, setPlayer] = useState(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerState, setPlayerState] = useState(-1); // YT.PlayerState.UNSTARTED
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [buffering, setBuffering] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // Initialize YouTube Player
  useEffect(() => {
    let active = true;
    let localPlayer = null;

    loadYoutubeAPI(() => {
      if (!active) return;

      const container = document.getElementById(playerIdRef.current);
      if (!container) return;

      localPlayer = new window.YT.Player(playerIdRef.current, {
        videoId: youtubeId,
        playerVars: {
          controls: 0,          // Hide YouTube native controls
          disablekb: 1,         // Disable keyboard controls
          rel: 0,               // Disable related videos
          modestbranding: 1,    // Minimize branding
          fs: 0,                // Disable native fullscreen button
          iv_load_policy: 3,    // Hide annotations
          showinfo: 0,          // Hide title/uploader
          origin: window.location.origin,
          playsinline: 1        // Play inline on mobile (prevent iOS default player)
        },
        events: {
          onReady: (event) => {
            if (!active) return;
            setPlayer(event.target);
            setPlayerReady(true);
            setDuration(event.target.getDuration() || 0);
            setVolume(event.target.getVolume() || 100);
            setIsMuted(event.target.isMuted() || false);
            setBuffering(false);
          },
          onStateChange: (event) => {
            if (!active) return;
            setPlayerState(event.data);

            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
              setBuffering(false);
              setDuration(event.target.getDuration() || 0);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              setBuffering(false);
            } else if (event.data === window.YT.PlayerState.BUFFERING) {
              setBuffering(true);
            } else if (event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              setBuffering(false);
            }
          }
        }
      });
    });

    return () => {
      active = false;
      if (localPlayer && localPlayer.destroy) {
        localPlayer.destroy();
      }
      setPlayer(null);
      setPlayerReady(false);
      setIsPlaying(false);
      setCurrentTime(0);
    };
  }, [youtubeId]);

  // Poll current playback time and video loaded fraction
  useEffect(() => {
    let interval;
    if (playerReady && player && isPlaying && !isDragging) {
      interval = setInterval(() => {
        setCurrentTime(player.getCurrentTime() || 0);
      }, 250);
    }
    return () => clearInterval(interval);
  }, [playerReady, player, isPlaying, isDragging]);

  // Auto-hide controls bar during playback
  useEffect(() => {
    const resetTimer = () => {
      setShowControls(true);
      if (mouseTimer.current) clearTimeout(mouseTimer.current);
      
      if (isPlaying) {
        mouseTimer.current = setTimeout(() => {
          setShowControls(false);
        }, 2500);
      }
    };

    const container = playerContainerRef.current;
    if (container) {
      container.addEventListener('mousemove', resetTimer);
      container.addEventListener('touchstart', resetTimer);
    }

    resetTimer();

    return () => {
      if (container) {
        container.removeEventListener('mousemove', resetTimer);
        container.removeEventListener('touchstart', resetTimer);
      }
      if (mouseTimer.current) clearTimeout(mouseTimer.current);
    };
  }, [isPlaying]);

  // Fullscreen event listener (handles Esc key and prefixed exits)
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullscreenElement ||
        document.msFullscreenElement
      );
      setIsFullScreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  // Controls Handlers
  const handlePlayPause = (e) => {
    if (e) e.stopPropagation();
    if (!player || !playerReady) return;

    if (isPlaying) {
      player.pauseVideo();
    } else {
      player.playVideo();
    }
  };

  const handleSeek = (clientX) => {
    if (!player || !duration || !progressBarRef.current) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const clickX = clientX - rect.left;
    const width = rect.width;
    const percentage = Math.max(0, Math.min(1, clickX / width));
    
    const newTime = percentage * duration;
    player.seekTo(newTime, true);
    setCurrentTime(newTime);
  };

  const handleMouseDown = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    handleSeek(e.clientX);
  };

  const handleTouchStart = (e) => {
    e.stopPropagation();
    setIsDragging(true);
    if (e.touches && e.touches[0]) {
      handleSeek(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        handleSeek(e.clientX);
      }
    };

    const handleTouchMove = (e) => {
      if (isDragging && e.touches && e.touches[0]) {
        handleSeek(e.touches[0].clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, duration]);

  const handleToggleMute = (e) => {
    if (e) e.stopPropagation();
    if (!player || !playerReady) return;

    if (isMuted) {
      player.unMute();
      setIsMuted(false);
      if (volume === 0) {
        player.setVolume(50);
        setVolume(50);
      }
    } else {
      player.mute();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e) => {
    e.stopPropagation();
    if (!player || !playerReady) return;

    const newVolume = parseInt(e.target.value, 10);
    setVolume(newVolume);
    player.setVolume(newVolume);

    if (newVolume > 0 && isMuted) {
      player.unMute();
      setIsMuted(false);
    } else if (newVolume === 0 && !isMuted) {
      player.mute();
      setIsMuted(true);
    }
  };

  const handleToggleFullScreen = (e) => {
    if (e) e.stopPropagation();
    const container = playerContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement &&
        !document.webkitFullscreenElement &&
        !document.mozFullscreenElement &&
        !document.msFullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else if (container.mozRequestFullScreen) {
        container.mozRequestFullScreen();
      } else if (container.msRequestFullscreen) {
        container.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  // Format seconds to MM:SS
  const formatTime = (timeInSecs) => {
    if (isNaN(timeInSecs)) return '0:00';
    const mins = Math.floor(timeInSecs / 60);
    const secs = Math.floor(timeInSecs % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const loadedFraction = (player && player.getVideoLoadedFraction) ? player.getVideoLoadedFraction() : 0;

  return (
    <div 
      ref={playerContainerRef}
      className="relative w-full h-full bg-black overflow-hidden select-none group/player"
      onClick={handlePlayPause}
      onContextMenu={(e) => e.preventDefault()} // Block browser right click context menu on the container
    >
      {/* 100% overlay to block direct pointer events to iframe, keeping it non-clickable/non-right-clickable */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div id={playerIdRef.current} className="w-full h-full absolute top-0 left-0"></div>
      </div>

      {/* Floating anti-piracy watermark inside the fullscreen-able container */}
      {watermarkText && (
        <div 
          className="absolute pointer-events-none z-30 select-none text-[11px] sm:text-xs font-bold text-white/20 bg-black/10 px-2 py-1 rounded backdrop-blur-[1px] transition-all duration-1000 ease-in-out border border-white/5"
          style={{ 
            top: `${watermarkPos?.top || 10}%`, 
            left: `${watermarkPos?.left || 10}%`,
          }}
        >
          {watermarkText} ({watermarkIp})
        </div>
      )}

      {/* Loading/Buffering Spinner */}
      {(buffering || !playerReady) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20 pointer-events-none">
          <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
        </div>
      )}

      {/* Big Play Button Overlay (when paused or ended) */}
      {!isPlaying && !buffering && playerReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 z-10 hover:bg-black/35 transition-colors cursor-pointer">
          <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center bg-primary-600/90 text-white rounded-full shadow-2xl transition-transform transform hover:scale-110 active:scale-95 duration-200 backdrop-blur-sm">
            <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />
          </div>
        </div>
      )}

      {/* Bottom Custom Control Bar */}
      <div 
        className={`absolute bottom-0 left-0 right-0 p-3 sm:p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-20 flex flex-col gap-2 transition-all duration-300 transform ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()} // Prevent clicking control buttons from pausing the video
      >
        {/* Progress Bar (Timeline Seekbar) */}
        <div 
          ref={progressBarRef}
          className="relative w-full h-4 flex items-center cursor-pointer group/progress"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Track Underlay */}
          <div className="w-full h-1 bg-white/20 rounded-full group-hover/progress:h-1.5 transition-all duration-150"></div>
          
          {/* Buffered fraction bar */}
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 group-hover/progress:h-1.5 bg-white/15 rounded-full pointer-events-none transition-all duration-150"
            style={{ width: `${loadedFraction * 100}%` }}
          ></div>

          {/* Played progress bar */}
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 group-hover/progress:h-1.5 bg-primary-600 rounded-full pointer-events-none transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          ></div>

          {/* Seek Knob */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-primary-500 rounded-full border border-white shadow-md opacity-0 group-hover/progress:opacity-100 pointer-events-none transition-opacity duration-150 transform -translate-x-1/2"
            style={{ left: `${progressPercent}%` }}
          ></div>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between">
          {/* Left: Play/Pause, Time */}
          <div className="flex items-center gap-3">
            <button 
              className="p-1.5 text-white hover:text-primary-400 hover:scale-105 active:scale-95 transition-all focus:outline-none"
              onClick={handlePlayPause}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current" />
              )}
            </button>
            
            <div className="text-xs text-white/95 font-medium font-mono select-none">
              {formatTime(currentTime)} <span className="text-white/40">/</span> {formatTime(duration)}
            </div>
          </div>

          {/* Right: Volume, Fullscreen */}
          <div className="flex items-center gap-3">
            {/* Volume Control */}
            <div className="flex items-center gap-2 group/volume">
              <button 
                className="p-1.5 text-white hover:text-primary-400 hover:scale-105 active:scale-95 transition-all focus:outline-none"
                onClick={handleToggleMute}
                title={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
              
              <input 
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-0 opacity-0 group-hover/volume:w-16 group-hover/volume:opacity-100 focus:w-16 focus:opacity-100 transition-all duration-300 accent-primary-500 h-1 rounded-lg cursor-pointer bg-white/20 outline-none"
              />
            </div>

            {/* Fullscreen Button */}
            <button 
              className="p-1.5 text-white hover:text-primary-400 hover:scale-105 active:scale-95 transition-all focus:outline-none"
              onClick={handleToggleFullScreen}
              title={isFullScreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullScreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
