"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquarePlus } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function FeedbackWidget() {
  const pathname = usePathname();
  const [isAuth, setIsAuth] = useState(false);
  const [page, setPage] = useState("");

  useEffect(() => {
    setPage(window.location.pathname);
  }, [pathname]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAuth(!!data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuth(!!session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const w = "https://tally.so/widgets/embed.js";
    if (document.querySelector(`script[src="${w}"]`)) return;
    const s = document.createElement("script");
    s.src = w;
    document.body.appendChild(s);
  }, []);

  if (!isAuth) return null;

  return (
    <button
      data-tally-open="oblyB5"
      data-tally-emoji-text="👋"
      data-tally-emoji-animation="wave"
      data-tally-auto-close="3000"
      data-page={page}
      aria-label="Enviar feedback"
      className="fixed right-4 z-40 flex items-center gap-2 rounded-full bg-[#1D1E20] px-4 py-3 text-white shadow-lg transition-all duration-200 hover:bg-[#2d2e30] hover:shadow-xl active:scale-95 md:right-6 md:bottom-6"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}
    >
      <MessageSquarePlus size={18} />
      <span className="hidden text-sm font-medium sm:block">Feedback</span>
    </button>
  );
}
