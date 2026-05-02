"use client";

import { useState, useEffect } from "react";
import { MessageSquarePlus, X } from "lucide-react";

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [formUrl, setFormUrl] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    // Detectar dispositivo
    const width = window.innerWidth;
    let device = "Laptop / Desktop";
    if (width < 768) device = "Celular";
    else if (width < 1024) device = "Tablet";

    // Página actual
    const page = window.location.pathname;

    // Base URL del Google Form
    const base = "https://docs.google.com/forms/d/1V8wX6mHnL7UCunPfJIi8fdxIB-bWLgxZL027gTvM4pA/preview";

    // Pre-llenar campos con entry IDs
    const params = new URLSearchParams({
      "entry.2079222760": device,
      "entry.292254079": page,
      embedded: "true",
    });

    setFormUrl(`${base}?${params.toString()}`);
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      {/* FAB — siempre visible */}
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Enviar feedback"
        className="fixed bottom-6 right-4 z-40 flex items-center gap-2 rounded-full bg-[#1D1E20] px-4 py-3 text-white shadow-lg transition-all duration-200 hover:bg-[#2d2e30] hover:shadow-xl active:scale-95 md:bottom-6 md:right-6"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
      >
        <MessageSquarePlus size={18} />
        <span className="text-sm font-medium">Feedback</span>
      </button>

      {/* Overlay + Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="relative z-10 flex w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:w-[480px] sm:rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#e8e8e8] px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-[#1D1E20]">
                  Enviar retroalimentación
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Tu opinión nos ayuda a mejorar Anfiora
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* iframe Google Form */}
            <div className="h-[520px] w-full sm:h-[560px]">
              {formUrl ? (
                <iframe
                  src={formUrl}
                  className="h-full w-full rounded-b-2xl"
                  frameBorder="0"
                  marginHeight={0}
                  marginWidth={0}
                  title="Formulario de feedback"
                >
                  Cargando…
                </iframe>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#48C9B0] border-t-transparent" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
