import { useState } from "react";
import { useNavigate, Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import {
  LogIn,
  UserRound,
  LockKeyhole,
  Eye,
  EyeOff,
  AlertCircle,
  Droplets,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

function Login() {
  const navigate = useNavigate();
  const { iniciarSesion } = useAuth();

  const [datos, setDatos] = useState({
    identificador: "",
    contrasena: "",
  });

  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const manejarCambio = (e) => {
    const { name, value } = e.target;

    setDatos((anterior) => ({
      ...anterior,
      [name]: value,
    }));

    setError("");
  };

  const manejarLogin = async (e) => {
    e.preventDefault();

    setError("");

    if (!datos.identificador.trim() || !datos.contrasena) {
      setError("Completá todos los campos.");
      return;
    }

    setCargando(true);

    try {
      await iniciarSesion(datos.identificador.trim(), datos.contrasena);

      // Redirigir a Inicio
      navigate("/", { replace: true });
    } catch (error) {
      setError(
        error instanceof TypeError
          ? "No se pudo conectar con el servidor."
          : error.message,
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <section className="flex min-h-[calc(100vh-160px)] items-center justify-center bg-slate-50 px-6 py-12 lg:py-20">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/70 lg:grid-cols-2">
        {/* PANEL IZQUIERDO */}
        <div className="relative hidden overflow-hidden bg-[#081727] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 top-20 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" />

          <div className="relative">
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-400">
              <Droplets size={32} />
            </div>

            <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">
              Lavadero Rioja
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-tight">
              Bienvenido
              <span className="block text-sky-400">nuevamente.</span>
            </h1>

            <p className="mt-6 max-w-sm leading-8 text-slate-400">
              Iniciá sesión para administrar tus vehículos, consultar tus
              reservas y disfrutar de una experiencia de lavado más sencilla.
            </p>
          </div>

          <div className="relative space-y-5">
            {[
              "Tus vehículos en un solo lugar",
              "Reservas rápidas y sencillas",
              "Historial de servicios",
            ].map((beneficio) => (
              <div
                key={beneficio}
                className="flex items-center gap-3 text-sm text-slate-300"
              >
                <CheckCircle2 size={20} className="text-sky-400" />
                {beneficio}
              </div>
            ))}
          </div>

          <div className="relative mt-12 flex items-center gap-3 border-t border-white/10 pt-8 text-sm text-slate-400">
            <ShieldCheck size={22} className="text-sky-400" />
            Tu cuenta, protegida y segura
          </div>
        </div>

        {/* FORMULARIO */}
        <div className="p-8 sm:p-12 lg:p-14">
          <div className="mb-10">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
              Acceso a tu cuenta
            </span>

            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
              Iniciar sesión
            </h2>

            <p className="mt-3 text-sm text-slate-500">
              Ingresá tus credenciales para continuar.
            </p>
          </div>

          <form onSubmit={manejarLogin} className="space-y-6">
            {/* USUARIO O CORREO */}
            <div>
              <label
                htmlFor="identificador"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Usuario o correo electrónico
              </label>

              <div className="relative">
                <UserRound
                  size={19}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="identificador"
                  name="identificador"
                  type="text"
                  autoComplete="username"
                  placeholder="Tu usuario o correo"
                  value={datos.identificador}
                  onChange={manejarCambio}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />
              </div>
            </div>

            {/* CONTRASEÑA */}
            <div>
              <label
                htmlFor="contrasena"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Contraseña
              </label>

              <div className="relative">
                <LockKeyhole
                  size={19}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="contrasena"
                  name="contrasena"
                  type={mostrarContrasena ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Ingresá tu contraseña"
                  value={datos.contrasena}
                  onChange={manejarCambio}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                />

                <button
                  type="button"
                  aria-label={
                    mostrarContrasena
                      ? "Ocultar contraseña"
                      : "Mostrar contraseña"
                  }
                  onClick={() => setMostrarContrasena(!mostrarContrasena)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-600"
                >
                  {mostrarContrasena ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            {/* ERROR */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-600"
              >
                <AlertCircle size={19} className="shrink-0" />
                {error}
              </div>
            )}

            {/* BOTÓN */}
            <button
              type="submit"
              disabled={cargando}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-sky-500 px-6 py-4 text-sm font-bold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn size={19} />

              {cargando ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>

            <p className="text-center text-sm text-slate-500">
              ¿Todavía no tenés una cuenta?{" "}
              <Link
                to="/registro"
                className="font-bold text-sky-600 hover:text-sky-700"
              >
                Registrate
              </Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}

export default Login;
