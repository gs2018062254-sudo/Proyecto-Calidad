import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function Layout() {
  useEffect(() => {
    // Smooth anchor behavior
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "auto";
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background ambient layers */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-night-900" />
        <div className="absolute inset-0 bg-radial-glow opacity-80" />
        <div
          className="absolute inset-0 bg-grid-slate bg-grid opacity-[0.35]"
          style={{
            maskImage:
              "radial-gradient(ellipse 80% 70% at 50% 0%, rgba(0,0,0,1) 0%, transparent 70%)",
            WebkitMaskImage:
              "radial-gradient(ellipse 80% 70% at 50% 0%, rgba(0,0,0,1) 0%, transparent 70%)",
          }}
        />
      </div>
      <div className="grain-overlay relative">
        <Navbar />
        <main className="relative">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
