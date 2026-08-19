import { useEffect, useRef, useCallback } from "react";
import type { SampleAccurateAudioEngine } from "./audio-transport";

export interface PlayheadControllerOptions {
  audioEngineRef: React.RefObject<SampleAccurateAudioEngine | null>;
  isPlaying: boolean;
<<<<<<< HEAD
  onSectionChange?: (sectionIndex: number) => void;
=======
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
}

export function usePlayheadController({
  audioEngineRef,
  isPlaying,
<<<<<<< HEAD
  onSectionChange,
=======
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
}: PlayheadControllerOptions) {
  const containerRefs = useRef<Map<string, HTMLElement>>(new Map());
  const playheadOverlayRefs = useRef<Map<string, HTMLElement>>(new Map());
  const stridesRef = useRef<Map<string, number>>(new Map());
  const rafIdRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Register a sequencer grid container
  const registerContainer = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      containerRefs.current.set(id, el);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.observe(el);
      }
      // Measure initial stride
      const width = el.clientWidth;
      if (width > 0) {
        stridesRef.current.set(id, width / 16);
      }
    } else {
      const existing = containerRefs.current.get(id);
      if (existing && resizeObserverRef.current) {
        resizeObserverRef.current.unobserve(existing);
      }
      containerRefs.current.delete(id);
      stridesRef.current.delete(id);
    }
  }, []);

  // Register the playhead indicator element
  const registerPlayhead = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      playheadOverlayRefs.current.set(id, el);
    } else {
      playheadOverlayRefs.current.delete(id);
    }
  }, []);

  // ResizeObserver for zero-cost layout tracking
  useEffect(() => {
    if (typeof ResizeObserver === "undefined") return;

    resizeObserverRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const target = entry.target as HTMLElement;
        const id = target.getAttribute("data-sequencer-id");
        if (id) {
          const width = entry.contentRect.width;
          if (width > 0) {
            stridesRef.current.set(id, width / 16);
          }
        }
      }
    });

    containerRefs.current.forEach((el) => {
      resizeObserverRef.current?.observe(el);
    });

    return () => {
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
    };
  }, []);

  // 60FPS RAF Playhead Loop reading AudioContext.currentTime
  useEffect(() => {
    if (!isPlaying) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      // Reset playheads to hidden / zero position
      playheadOverlayRefs.current.forEach((el) => {
        el.style.opacity = "0";
        el.style.transform = "translate3d(0, 0, 0)";
      });
      containerRefs.current.forEach((container) => {
        container.querySelectorAll(".step-col.is-playing").forEach((node) => {
          node.classList.remove("is-playing");
        });
      });
      return;
    }

    let lastDiscreteStep = -1;
<<<<<<< HEAD
    let lastSectionIndex = -1;
=======
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2

    const tick = () => {
      const engine = audioEngineRef.current;
      if (!engine || !engine.getIsPlaying()) {
        rafIdRef.current = null;
        return;
      }

      const ctx = engine.getContext();
      const startTime = engine.getTransportStartTime();
      const stepDuration = engine.getStepDuration();
      const currentTime = ctx.currentTime;

      if (currentTime >= startTime && stepDuration > 0) {
<<<<<<< HEAD
        const playhead = engine.getPlayheadPosition();
        const continuousPosition = playhead.localStep;
        const discreteStep = Math.floor(continuousPosition);

        if (playhead.sectionIndex !== lastSectionIndex) {
          lastSectionIndex = playhead.sectionIndex;
          onSectionChange?.(playhead.sectionIndex);
        }

=======
        const elapsed = currentTime - startTime;
        const continuousPosition = (elapsed / stepDuration) % 16;
        const discreteStep = Math.floor(continuousPosition);

>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
        // 1. Update Continuous Overlay Playhead via transform: translate3d
        playheadOverlayRefs.current.forEach((el, id) => {
          const stride = stridesRef.current.get(id) || (el.parentElement?.clientWidth ? el.parentElement.clientWidth / 16 : 0);
          if (stride > 0) {
            el.style.opacity = "1";
            el.style.transform = `translate3d(${continuousPosition * stride}px, 0, 0)`;
          }
        });

        // 2. Update discrete step highlighting on step change without React re-renders
        if (discreteStep !== lastDiscreteStep) {
          lastDiscreteStep = discreteStep;
          containerRefs.current.forEach((container) => {
            const children = container.querySelectorAll(".step-col");
            children.forEach((child, idx) => {
              if (idx === discreteStep) {
                child.classList.add("is-playing");
              } else {
                child.classList.remove("is-playing");
              }
            });
          });
        }
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
<<<<<<< HEAD
  }, [isPlaying, audioEngineRef, onSectionChange]);
=======
  }, [isPlaying, audioEngineRef]);
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2

  return {
    registerContainer,
    registerPlayhead,
  };
}
