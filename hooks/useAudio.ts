/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { useCallback, useEffect, useRef, useState } from "react";

export default function useAudio() {
  // We use refs so the audio objects persist between renders
  // without triggering unnecessary re-renders.
  const bgSource = useRef<HTMLAudioElement | null>(null);
  const fgSource = useRef<HTMLAudioElement | null>(null);
  const audioCache = useRef<Record<string, HTMLAudioElement>>({});
  const [bgPlaying, setBgPlaying] = useState(false);
  const soundEnabled = true

  useEffect(() => {
    if (bgSource.current) {
      bgSource.current.muted = !soundEnabled;
    }
    if (fgSource.current) {
      fgSource.current.muted = !soundEnabled;
    }
  }, [soundEnabled]);

  const playBackground = (path: string, volume = 0.5) => {
    // check if we are already playing the same background music
    if (bgSource.current && bgSource.current.src.endsWith(path)) {
      if (!bgPlaying && soundEnabled) {
        bgSource.current.play().catch(err => console.error("Audio playback failed:", err));
        setBgPlaying(true);
      }
      return;
    }

    // Stop and clear the existing background track
    if (bgSource.current) {
      bgSource.current.pause();
      bgSource.current = null;
    }

    const audio = new Audio(path);
    audio.loop = true;
    audio.volume = volume;
    if (soundEnabled) {
      audio.play().catch(err => console.error("Audio playback failed:", err));
    }
    bgSource.current = audio;
    setBgPlaying(true);
  };

  const playForeground = (path: string, volume = 0.5) => {
    if (soundEnabled) {
      // Retrieve from cache or create new Audio instance
      let audio = audioCache.current[path];
      if (!audio) {
        audio = new Audio(path);
        audio.preload = "auto";
        audioCache.current[path] = audio;
      }

      // Reset audio state for replay
      audio.currentTime = 0;
      audio.loop = false;
      audio.volume = volume;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => console.error("Audio playback failed:", err));
      }
      fgSource.current = audio;
    }
  };

  const toggleBackgroundPause = useCallback(() => {
    if (!bgSource.current) return;
    bgPlaying ? bgSource.current.pause() : bgSource.current.play();
    setBgPlaying(prev => !prev);
  }, [bgPlaying]);

  const pauseBackground = useCallback(() => {
    if (bgSource.current) {
      bgSource.current.pause();
      setBgPlaying(false);
    }
  }, []);

  const resumeBackground = useCallback(() => {
    if (bgSource.current && soundEnabled) {
      bgSource.current.play().catch(err => console.error("Audio playback failed:", err));
      setBgPlaying(true);
    }
  }, [soundEnabled]);

  useEffect(() => {
    const handleVisiblityChange = function() {
      if (document.hidden) {
        pauseBackground()
      } else {
        resumeBackground();
      }
    };
    document.addEventListener("visibilitychange", handleVisiblityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisiblityChange);
    };
  },[])

  const stopAll = () => {
    bgSource.current?.pause();
    Object.values(audioCache.current).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    setBgPlaying(false);
  };

  const preloadCache = (paths: string[]) => {
    paths.forEach(path => {
      if (!audioCache.current[path]) {
        const audio = new Audio(path);
        audio.preload = "auto";
        audioCache.current[path] = audio;
      }
    });
  };

  return {
    playBackground,
    playForeground,
    stopAll,
    toggleBackgroundPause,
    preloadCache
  };
}
