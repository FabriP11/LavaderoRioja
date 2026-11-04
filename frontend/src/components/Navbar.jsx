import { useState } from "react";
import { Link, useNavigate } from "react-router";

import {
  Droplets,
  Menu,
  X,
  UserRound,
  ChevronDown,
  LogOut,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

function Navbar() {
  const navigate = useNavigate();

  const { usuario, comprobandoSesion, cerrarSesion } = useAuth();

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [errorSalida, setErrorSalida] = useState("");

  const enlaces = [
    { nombre: "Inicio", ruta: "/#inicio" },
    { nombre: "Servicios", ruta: "/#servicios" },
    { nombre: "Cómo funciona", ruta: "/#como-funciona" },
  ];

  const manejarLogout = async () => {
    setErrorSalida("");

    try {
      await cerrarSesion();

      setMenuAbierto(false);
      setMenuUsuario(false);

      navigate("/", { replace: true });
    } catch (error) {
      setErrorSalida(error.message);
    }
  };

  return (
    <header className="relative z-20 bg-[#081727] text-white">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
        {/* LOGO */}
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400 text-slate-950">
            <Droplets size={25} strokeWidth={2.5} />
          </div>

          <div className="flex flex-col leading-tight">
            <span className="text-xl font-extrabold tracking-tight">
              Lavadero
              <span className="text-sky-400">Rioja</span>
            </span>

            <span className="text-[10px] font-semibold tracking-[0.23em] text-slate-400">
              CAR WASH & DETAILING
            </span>
          </div>
        </Link>

        {/* NAVEGACIÓN DESKTOP */}
        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
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

        {/* SESIÓN DESKTOP */}
        <div className="hidden items-center gap-3 md:flex">
          {!comprobandoSesion && !usuario && (
            <>
              <Link
                to="/login"
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-300 transition hover:text-white"
              >
                Iniciar sesión
              </Link>

              <Link
                to="/registro"
                className="rounded-xl bg-sky-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-300"
              >
                Registrarse
              </Link>
            </>
          )}

          {!comprobandoSesion && usuario && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuUsuario(!menuUsuario)}
                aria-expanded={menuUsuario}
                aria-label="Menú de usuario"
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
              >
                <UserRound size={20} className="text-sky-400" />

                <span className="text-sm font-semibold">
                  {usuario.nombre_usuario}
                </span>

                <ChevronDown size={16} />
              </button>

              {menuUsuario && (
                <div className="absolute right-0 top-full z-50 mt-3 w-56 rounded-xl border border-slate-200 bg-white p-2 text-slate-900 shadow-xl">
                  <div className="border-b border-slate-100 px-3 py-3">
                    <p className="text-xs text-slate-500">Sesión iniciada</p>

                    <p className="mt-1 truncate text-sm font-bold">
                      {usuario.nombre_usuario}
                    </p>

                    <p className="mt-1 text-xs capitalize text-sky-600">
                      {usuario.rol}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={manejarLogout}
                    className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    <LogOut size={18} />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOTÓN MÓVIL */}
        <button
          type="button"
          onClick={() => setMenuAbierto(!menuAbierto)}
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuAbierto}
          className="rounded-xl p-2 md:hidden"
        >
          {menuAbierto ? <X /> : <Menu />}
        </button>
      </div>

      {/* MENÚ MÓVIL */}
      {menuAbierto && (
        <nav className="flex flex-col gap-4 border-t border-white/10 px-6 py-5 text-sm md:hidden">
          {enlaces.map((enlace) => (
            <a
              key={enlace.ruta}
              href={enlace.ruta}
              onClick={() => setMenuAbierto(false)}
              className="text-slate-200"
            >
              {enlace.nombre}
            </a>
          ))}

          {!comprobandoSesion && !usuario && (
            <>
              <Link
                to="/login"
                onClick={() => setMenuAbierto(false)}
                className="text-sky-400"
              >
                Iniciar sesión
              </Link>

              <Link
                to="/registro"
                onClick={() => setMenuAbierto(false)}
                className="text-sky-400"
              >
                Registrarse
              </Link>
            </>
          )}

          {!comprobandoSesion && usuario && (
            <>
              <div className="border-t border-white/10 pt-4">
                <div className="flex items-center gap-2">
                  <UserRound size={18} className="text-sky-400" />

                  <span className="font-semibold">
                    {usuario.nombre_usuario}
                  </span>
                </div>

                <p className="mt-1 text-xs capitalize text-slate-400">
                  {usuario.rol}
                </p>
              </div>

              <button
                type="button"
                onClick={manejarLogout}
                className="flex items-center gap-2 text-left text-red-400"
              >
                <LogOut size={18} />
                Cerrar sesión
              </button>
            </>
          )}
        </nav>
      )}

      {errorSalida && (
        <p role="alert" className="px-6 pb-3 text-center text-sm text-red-300">
          {errorSalida}
        </p>
      )}
    </header>
  );
}

export default Navbar;
