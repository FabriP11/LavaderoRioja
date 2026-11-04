import { useState } from "react";
import { Droplets, Menu, X } from "lucide-react";

function Navbar() {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const enlaces = [
    { nombre: "Inicio", ruta: "#inicio" },
    { nombre: "Servicios", ruta: "#servicios" },
    { nombre: "Cómo funciona", ruta: "#como-funciona" },
  ];

  return (
    <header className="relative z-20 bg-[#081727] text-white">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
        <a href="#inicio" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400 text-slate-950">
            <Droplets size={25} strokeWidth={2.5} />
          </div>

          <div className="flex flex-col leading-tight">
            <span className="text-xl font-extrabold tracking-tight">
              Lavadero<span className="text-sky-400">Rioja</span>
            </span>

            <span className="text-[10px] font-semibold tracking-[0.23em] text-slate-400">
              CAR WASH & DETAILING
            </span>
          </div>
        </a>

        <nav className="hidden items-center gap-9 text-sm font-medium text-slate-300 md:flex">
          {enlaces.map((enlace) => (
            <a
              key={enlace.ruta}
              href={enlace.ruta}
              className="transition hover:text-sky-400"
            >
              {enlace.nombre}
            </a>
          ))}
        </nav>

        <div className="hidden md:block">
          <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-xs font-semibold text-sky-300">
            Reservas online próximamente
          </span>
        </div>

        <button
          type="button"
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuAbierto}
          onClick={() => setMenuAbierto(!menuAbierto)}
          className="rounded-xl p-2 md:hidden"
        >
          {menuAbierto ? <X /> : <Menu />}
        </button>
      </div>

      {menuAbierto && (
        <nav className="flex flex-col gap-4 border-t border-white/10 px-6 py-5 text-sm md:hidden">
          {enlaces.map((enlace) => (
            <a
              key={enlace.ruta}
              href={enlace.ruta}
              onClick={() => setMenuAbierto(false)}
              className="text-slate-200 hover:text-sky-400"
            >
              {enlace.nombre}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

export default Navbar;
