import { Navigate } from "react-router";
import {
  UserRound,
  ShieldCheck,
  AtSign,
  IdCard,
  CarFront,
  CalendarDays,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

function MiPerfil() {
  const { usuario, comprobandoSesion } = useAuth();

  if (comprobandoSesion) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-500">
        <LoaderCircle className="animate-spin text-sky-500" />
        Cargando perfil...
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  const nombreCompleto =
    [usuario.nombre, usuario.apellido].filter(Boolean).join(" ") ||
    usuario.nombre_usuario;

  return (
    <section className="min-h-screen bg-slate-50 px-6 py-12 lg:py-16">
      <div className="mx-auto max-w-5xl">
        {/* ENCABEZADO */}
        <div className="mb-9">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
            Mi cuenta
          </span>

          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">
            Mi perfil
          </h1>

          <p className="mt-3 text-slate-500">
            Consultá tu información personal y los datos de tu cuenta.
          </p>
        </div>

        {/* TARJETA PRINCIPAL */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="relative bg-[#081727] p-8 text-white sm:p-10">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />

            <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-400">
                <UserRound size={42} strokeWidth={1.5} />
              </div>

              <div>
                <h2 className="text-2xl font-bold">{nombreCompleto}</h2>

                <p className="mt-1 text-slate-400">@{usuario.nombre_usuario}</p>

                <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 size={14} />
                  Sesión iniciada
                </div>
              </div>
            </div>
          </div>

          {/* INFORMACIÓN PERSONAL */}
          <div className="p-8 sm:p-10">
            <div className="mb-7 flex items-center gap-3">
              <IdCard className="text-sky-600" size={22} />
              <h3 className="text-xl font-bold text-slate-950">
                Información de la cuenta
              </h3>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <DatoPerfil
                icono={UserRound}
                etiqueta="Nombre"
                valor={usuario.nombre || "No registrado"}
              />

              <DatoPerfil
                icono={UserRound}
                etiqueta="Apellido"
                valor={usuario.apellido || "No registrado"}
              />

              <DatoPerfil
                icono={AtSign}
                etiqueta="Nombre de usuario"
                valor={usuario.nombre_usuario}
              />

              <DatoPerfil
                icono={ShieldCheck}
                etiqueta="Tipo de cuenta"
                valor={
                  usuario.rol === "administrador" ? "Administrador" : "Cliente"
                }
              />
            </div>

            <div className="mt-8 rounded-2xl border border-sky-100 bg-sky-50 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck size={22} className="shrink-0 text-sky-600" />

                <div>
                  <p className="font-semibold text-slate-900">
                    Cuenta protegida
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Tu sesión está protegida mediante autenticación con cookies.
                    La modificación de datos personales estará disponible
                    próximamente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FUTURAS FUNCIONALIDADES */}
        <div className="mt-10">
          <h3 className="mb-5 text-xl font-bold text-slate-950">
            Mis servicios
          </h3>

          <div className="grid gap-5 sm:grid-cols-2">
            <TarjetaFuncion
              icono={CarFront}
              titulo="Mis vehículos"
              descripcion="Registrá y administrá los vehículos asociados a tu cuenta."
            />

            <TarjetaFuncion
              icono={CalendarDays}
              titulo="Mis turnos"
              descripcion="Consultá tus reservas y el historial de lavados realizados."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function DatoPerfil({ icono: Icono, etiqueta, valor }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-3 flex items-center gap-2 text-slate-500">
        <Icono size={17} />
        <span className="text-xs font-semibold uppercase tracking-wide">
          {etiqueta}
        </span>
      </div>

      <p className="font-semibold text-slate-900">{valor}</p>
    </div>
  );
}

function TarjetaFuncion({ icono: Icono, titulo, descripcion }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
        <Icono size={24} />
      </div>

      <h4 className="text-lg font-bold text-slate-900">{titulo}</h4>

      <p className="mt-2 text-sm leading-6 text-slate-500">{descripcion}</p>

      <span className="mt-5 inline-block rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
        Próximamente
      </span>
    </div>
  );
}

export default MiPerfil;
