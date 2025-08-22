document.addEventListener("DOMContentLoaded", welcomeVideoToken);

function welcomeVideoToken() {
  const html = document.documentElement;
  const fontFamily = "--font-family";
  const robotoBold = getComputedStyle(html).getPropertyValue(fontFamily).trim();
  const body = document.body;
  body.style.fontFamily = robotoBold;

  const foxyVideoContainer = document.getElementById("foxyVideoContainerId");
  const foxyVideo = document.getElementById("foxyVideoId");

  if (!foxyVideoContainer || !foxyVideo) {
    console.warn(
      "Die Video-Elemente wurden nicht gefunden (foxyVideoContainerId oder foxyVideoId fehlt)."
    );
    return;
  }

  const params = new URLSearchParams(window.location.search);

  const parseBool = (v) => {
    if (v === null) return false;
    const s = String(v).trim().toLowerCase();
    if (s === "1" || s === "true") return true;
    if (s === "0" || s === "false") return false;
    return false;
  };

  const parseNumber = (v, fallback = null) => {
    if (v === null) return fallback;
    if (String(v).trim() === "") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const autoplay = parseBool(params.get("autoplay"));
  const muted = parseBool(params.get("muted"));
  const loop = parseBool(params.get("loop"));
  const start = parseNumber(params.get("start"), null);
  const volume = parseNumber(params.get("volume"), null);
  const playbackRate = parseNumber(params.get("rate"), null);

  if (muted) {
    foxyVideo.muted = true;
    foxyVideo.setAttribute("muted", "");
  } else {
    foxyVideo.muted = false;
    foxyVideo.removeAttribute("muted");
  }

  if (loop) {
    foxyVideo.loop = true;
    foxyVideo.setAttribute("loop", "");
  } else {
    foxyVideo.loop = false;
    foxyVideo.removeAttribute("loop");
  }

  foxyVideo.playsInline = true;
  foxyVideo.setAttribute("playsinline", "");

  if (volume !== null) {
    const v = Math.min(1, Math.max(0, volume));
    try {
      foxyVideo.volume = v;
    } catch (e) {
      console.warn("Volume konnte nicht gesetzt werden:", e);
    }
  }

  if (playbackRate !== null) {
    const r = playbackRate > 0 ? playbackRate : 1;
    foxyVideo.playbackRate = r;
  }

  const applyStartTime = () => {
    if (start !== null) {
      try {
        const dur = Number.isFinite(Number(foxyVideo.duration))
          ? Number(foxyVideo.duration)
          : Infinity;
        const t = Math.min(Math.max(0, start), dur);
        foxyVideo.currentTime = t;
      } catch (e) {
        console.debug(
          "Startzeit konnte noch nicht gesetzt werden, versuche später:",
          e
        );
      }
    }
  };

  if (Number.isFinite(Number(foxyVideo.duration))) {
    applyStartTime();
  } else {
    foxyVideo.addEventListener("loadedmetadata", applyStartTime, {
      once: true,
    });
  }

  if (autoplay) {
    foxyVideo.setAttribute("autoplay", "");
    const p = foxyVideo.play();
    if (p !== undefined) {
      p.then(() =>
        console.debug("Video abgespielt (autoplay erfolgreich).")
      ).catch((err) => console.warn("Autoplay fehlgeschlagen.", err));
    }
  }

  foxyVideo.addEventListener("error", (e) => {
    console.error("Video-Fehler:", e);
  });

  const FALLBACK_W = 1920;
  const FALLBACK_H = 1080;

  const containerComputed = getComputedStyle(foxyVideoContainer);
  if (!containerComputed.position || containerComputed.position === "static") {
    foxyVideoContainer.style.position = "relative";
  }
  foxyVideoContainer.style.overflow = "hidden";

  Object.assign(foxyVideo.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    transformOrigin: "50% 50%",
  });

  const getIntrinsic = () => {
    const iw = foxyVideo.videoWidth || FALLBACK_W;
    const ih = foxyVideo.videoHeight || FALLBACK_H;
    return { iw, ih };
  };

  const fitMode = (params.get("fit") || "cover").toLowerCase();

  let rafId = null;
  const updateScale = () => {
    const { iw, ih } = getIntrinsic();
    if (!iw || !ih) {
      scheduleUpdate();
      return;
    }

    const rect = foxyVideoContainer.getBoundingClientRect();
    const cw = rect.width || window.innerWidth;
    const ch = rect.height || window.innerHeight;
    if (cw <= 0 || ch <= 0) return;

    let scale;
    if (fitMode === "contain") {
      scale = Math.min(cw / iw, ch / ih);
    } else {
      scale = Math.max(cw / iw, ch / ih);
    }

    foxyVideo.style.width = `${iw}px`;
    foxyVideo.style.height = `${ih}px`;
    foxyVideo.style.transform = `translate(-50%, -50%) scale(${scale})`;
  };

  const scheduleUpdate = () => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      updateScale();
      rafId = null;
    });
  };

  let ro = null;
  if (window.ResizeObserver) {
    try {
      ro = new ResizeObserver(scheduleUpdate);
      ro.observe(foxyVideoContainer);
    } catch (e) {
      ro = null;
    }
  }
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("orientationchange", scheduleUpdate);
  foxyVideo.addEventListener("loadedmetadata", scheduleUpdate);
  foxyVideo.addEventListener("play", scheduleUpdate);

  setTimeout(scheduleUpdate, 50);
  scheduleUpdate();

  welcomeVideoStyleToken(foxyVideoContainer, foxyVideo);

  const cleanup = () => {
    if (ro && typeof ro.disconnect === "function") ro.disconnect();
    window.removeEventListener("resize", scheduleUpdate);
    window.removeEventListener("orientationchange", scheduleUpdate);
    foxyVideo.removeEventListener("loadedmetadata", scheduleUpdate);
    foxyVideo.removeEventListener("play", scheduleUpdate);
  };
  window.addEventListener("beforeunload", cleanup, { once: true });
}

function welcomeVideoStyleToken(foxyVideoContainer, foxyVideo) {
  const videoElArray = [foxyVideoContainer, foxyVideo];
  const eventArray = ["copy", "dragstart", "keydown", "select"];
  const styleData = {
    userSelect: "none",
    cursor: "default",
    pointerEvents: "none",
  };

  videoElArray.forEach((element) => {
    eventArray.forEach((eventName) => {
      element.addEventListener(eventName, (e) => e.preventDefault());
    });
    Object.assign(element.style, styleData);
  });
}
