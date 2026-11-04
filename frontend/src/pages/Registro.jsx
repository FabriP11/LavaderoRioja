import { useState } from "react";
import {
  UserRoundPlus,
  UserRound,
  Mail,
  LockKeyhole,
  Phone,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

function Registro() {
  const [datos, setDatos] = useState({
    nombre: "",
    apellido: "",
    nombre_usuario: "",
    correo: "",
    telefono: "",
    contrasena: "",
    confirmarContrasena: "",
  });

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const manejarCambio = (e) => {
    const { name, value } = e.target;

    setDatos((anterior) => ({
      ...anterior,
      [name]: value,
    }));

    setError("");
    setMensaje("");
  };

  const manejarRegistro = (e) => {
    e.preventDefault();

    setError("");
    setMensaje("");

    if (
      !datos.nombre.trim() ||
      !datos.apellido.trim() ||
      !datos.nombre_usuario.trim() ||
      !datos.correo.trim() ||
      !datos.contrasena
    ) {
      setError("Completá todos los campos obligatorios.");
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(datos.nombre_usuario)) {
      setError(
        "El usuario debe tener entre 3 y 30 caracteres: letras, números o guiones bajos.",
      );
      return;
    }

    if (datos.contrasena.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (datos.contrasena !== datos.confirmarContrasena) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setMensaje(
      "Formulario validado. Falta conectar el registro con el servidor.",
    );
  };

  const campos = [
    {
      nombre: "nombre",
      etiqueta: "Nombre",
      placeholder: "Tu nombre",
      tipo: "text",
      icono: UserRound,
      autoComplete: "given-name",
    },
    {
      nombre: "apellido",
      etiqueta: "Apellido",
      placeholder: "Tu apellido",
      tipo: "text",
      icono: UserRound,
      autoComplete: "family-name",
    },
    {
      nombre: "nombre_usuario",
      etiqueta: "Nombre de usuario",
      placeholder: "Ej: fabricio123",
      tipo: "text",
      icono: UserRound,
      autoComplete: "username",
    },
    {
      nombre: "correo",
      etiqueta: "Correo electrónico",
      placeholder: "ejemplo@correo.com",
      tipo: "email",
      icono: Mail,
      autoComplete: "email",
    },
    {
      nombre: "telefono",
      etiqueta: "Teléfono (opcional)",
      placeholder: "Ej: 3804123456",
      tipo: "tel",
      icono: Phone,
      autoComplete: "tel",
    },
    {
      nombre: "contrasena",
      etiqueta: "Contraseña",
      placeholder: "Mínimo 8 caracteres",
      tipo: "password",
      icono: LockKeyhole,
      autoComplete: "new-password",
    },
    {
      nombre: "confirmarContrasena",
      etiqueta: "Confirmar contraseña",
      placeholder: "Repetí tu contraseña",
      tipo: "password",
      icono: LockKeyhole,
      autoComplete: "new-password",
    },
  ];

  return (
    <section className="min-h-[calc(100vh-160px)] bg-slate-50 py-12 lg:py-20">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-200/70 lg:grid-cols-2">
        {/* PANEL IZQUIERDO */}
        <div className="relative hidden overflow-hidden bg-[#081727] p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-24 top-20 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" />

          <div className="relative">
            <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-400">
              <UserRoundPlus size={32} />
            </div>

            <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-400">
              Lavadero Rioja
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-tight">
              Tu próximo lavado
              <span className="block text-sky-400">empieza acá.</span>
            </h1>

            <p className="mt-6 max-w-sm leading-8 text-slate-400">
              Creá tu cuenta y preparate para reservar turnos, registrar tus
              vehículos y consultar tus próximos lavados desde un solo lugar.
            </p>
          </div>

          <div className="relative space-y-5">
            {[
              "Administrá tus vehículos",
              "Reservá turnos online",
              "Consultá tu historial de lavados",
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
            Acceso seguro a tu información
          </div>
        </div>

        {/* FORMULARIO */}
        <div className="p-6 sm:p-10 lg:p-12">
          <div className="mb-9">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
              Crear cuenta
            </span>

            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950">
              Registrate
            </h2>

            <p className="mt-3 text-sm text-slate-500">
              Completá tus datos para comenzar.
            </p>
          </div>

          <form onSubmit={manejarRegistro} className="space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {campos.map((campo) => {
                const Icono = campo.icono;

                return (
                  <div
                    key={campo.nombre}
                    className={
                      campo.nombre === "nombre" || campo.nombre === "apellido"
                        ? ""
                        : "sm:col-span-2"
                    }
                  >
                    <label
                      htmlFor={campo.nombre}
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      {campo.etiqueta}
                    </label>

                    <div className="relative">
                      <Icono
                        size={19}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id={campo.nombre}
                        name={campo.nombre}
                        type={campo.tipo}
                        placeholder={campo.placeholder}
                        value={datos[campo.nombre]}
                        onChange={manejarCambio}
                        autoComplete={campo.autoComplete}
                        required={campo.nombre !== "telefono"}
                        minLength={campo.tipo === "password" ? 8 : undefined}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-600"
              >
                <AlertCircle size={19} className="shrink-0" />
                {error}
              </div>
            )}

            {mensaje && (
              <div
                role="status"
                className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700"
              >
                <CheckCircle2 size={19} className="shrink-0" />
                {mensaje}
              </div>
            )}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-4 text-sm font-bold text-white transition hover:bg-sky-600"
            >
              <UserRoundPlus size={19} />
              Validar datos
            </button>

            <p className="text-center text-xs leading-6 text-slate-400">
              El registro de cuentas se habilitará cuando conectemos el
              formulario con el servidor.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}

export default Registro;
