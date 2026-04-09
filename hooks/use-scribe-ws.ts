"use client";

import { useRef, useState, useCallback } from "react";

export function useScribeWS(onFinal: (text: string) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [liveText, setLiveText] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const start = useCallback(async () => {
    const res = await fetch("/api/transcribe-ws-token");
    const { url } = await res.json();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          e.data.arrayBuffer().then((buf) => ws.send(buf));
        }
      };
      recorder.start(250);
      setIsRecording(true);
    };

    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "transcript") {
        setLiveText(msg.text ?? "");
        if (msg.is_final) {
          onFinal(msg.text ?? "");
        }
      }
    };

    ws.onclose = () => {
      stream.getTracks().forEach((t) => t.stop());
      setIsRecording(false);
    };
  }, [onFinal]);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    wsRef.current?.close();
    setIsRecording(false);
    setLiveText("");
  }, []);

  return { liveText, isRecording, start, stop };
}
