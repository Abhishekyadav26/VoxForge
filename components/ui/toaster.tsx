"use client";
import { Toaster as HotToaster } from "react-hot-toast";

/** Theme-matched toaster for react-hot-toast. Mount once in the root layout. */
export default function Toaster() {
  return (
    <HotToaster
      /* Top-center: the Studio composer is fixed to the bottom, so
         bottom-anchored toasts would sit behind it on phones. */
      position="top-center"
      containerStyle={{ top: 68 }}
      gutter={10}
      toastOptions={{
        /* 5s floor (motion-and-zoom: timers get at least 5s) */
        duration: 5000,
        style: {
          background: "#0f172a", // slate-900
          color: "#e2e8f0", // slate-200
          border: "1px solid #334155", // slate-700
          borderRadius: "10px",
          fontSize: "14px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        },
        success: { iconTheme: { primary: "#4ade80", secondary: "#0f172a" } },
        error: { iconTheme: { primary: "#f87171", secondary: "#0f172a" } },
        loading: { iconTheme: { primary: "#94a3b8", secondary: "#0f172a" } },
      }}
    />
  );
}