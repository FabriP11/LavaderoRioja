import { useEffect, useState } from "react";
import { Link } from "react-router";

import {
  Droplets,
  ArrowRight,
  CalendarDays,
  CarFront,
  Clock3,
  ShieldCheck,
  CheckCircle2,
  UserRound,
  LayoutDashboard,
  Wrench,
  Settings2,
  ClipboardList,
  UserPlus,
  LoaderCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

function formatearPrecio(precio) {
  return Number(precio).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

function TarjetaAcceso({ icono: Icono, titulo, descripcion, ruta }) {
  return (
    <Link
      to={ruta}
      className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-lg"
    >
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
        <Icono size={24} />
      </div>

      <h3 className="text-lg font-bold text-slate-950">{titulo}</h3>

      <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">
        {descripcion}
      </p>

      <div className="mt-6 flex items-center gap-2 text-sm font-bold text-sky-600">
        Acceder
        <ArrowRight
          size={17}
          className="transition group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}

function Inicio() {
  const { usuario, comprobandoSesion } = useAuth();

  const [servicios, setServicios] = useState([]);
  const [cargandoServicios, setCargandoServicios] = useState(true);
  const [errorServicios, setErrorServicios] = useState("");

  const esAdmin = usuario?.rol === "administrador";

  useEffect(() => {
    const controller = new AbortController();

    async function cargarServicios() {
      try {
        const respuesta = await fetch(`${API_URL}/api/servicios`, {
          signal: controller.signal,
        });

        if (!respuesta.ok) {
          throw new Error("No se pudieron obtener los servicios.");
        }

        const datos = await respuesta.json();

        const lista = Array.isArray(datos) ? datos : datos.servicios;

        if (!Array.isArray(lista)) {
          throw new Error("Formato de servicios inválido.");
        }

        if (!controller.signal.aborted) {
          setServicios(
            lista.filter((servicio) => Number(servicio.activo ?? 1) === 1),
          );
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorServicios(
            error instanceof TypeError
              ? "No se pudo conectar con el servidor."
              : error.message,
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoServicios(false);
        }
      }
    }

    cargarServicios();

    return () => controller.abort();
  }, []);

  const accesosCliente = [
    {
      icono: CalendarDays,
      titulo: "Reservar turno",
      descripcion: "Elegí tu vehículo, servicio, fecha y horario disponible.",
      ruta: "/reservar-turno",
    },
    {
      icono: ClipboardList,
      titulo: "Mis turnos",
      descripcion: "Consultá tus próximas reservas, historial y cancelaciones.",
      ruta: "/mis-turnos",
    },
    {
      icono: CarFront,
      titulo: "Mis vehículos",
      descripcion: "Registrá, consultá, editá y administrá tus vehículos.",
      ruta: "/mis-vehiculos",
    },
    {
      icono: UserRound,
      titulo: "Mi perfil",
      descripcion: "Consultá los datos personales de tu cuenta.",
      ruta: "/mi-perfil",
    },
  ];

  const accesosAdmin = [
    {
      icono: LayoutDashboard,
      titulo: "Panel de administración",
      descripcion: "Consultá todas las reservas y gestioná sus estados.",
      ruta: "/admin",
    },
    {
      icono: CalendarDays,
      titulo: "Agenda de puestos",
      descripcion: "Visualizá las reservas de los dos puestos de lavado.",
      ruta: "/admin/agenda",
    },
    {
      icono: Wrench,
      titulo: "Bloquear horarios",
      descripcion: "Administrá mantenimientos y cierres de agenda.",
      ruta: "/admin/agenda",
    },
    {
      icono: Settings2,
      titulo: "Administrar servicios",
      descripcion: "Modificá precios, duraciones y disponibilidad.",
      ruta: "/admin/servicios",
    },
  ];

  const accesos = esAdmin ? accesosAdmin : accesosCliente;

  return (
    <div className="bg-slate-50">
      {/* INICIO / HERO */}
      <section
        id="inicio"
        className="relative overflow-hidden bg-[#081727] text-white"
      >
        <div className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-sky-400/15 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-24 left-0 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-sky-300">
              <Sparkles size={15} />
              Lavadero Rioja
            </span>

            <h1 className="mt-7 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Tu auto impecable.
              <span className="mt-2 block text-sky-400">
                Sin complicaciones.
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-base leading-8 text-slate-300">
              Elegí el servicio que necesitás, consultá los horarios disponibles
              y reservá tu turno online. Nosotros nos encargamos del resto.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              {!comprobandoSesion && (
                <Link
                  to={
                    esAdmin
                      ? "/admin"
                      : usuario
                        ? "/reservar-turno"
                        : "/registro"
                  }
                  className="inline-flex items-center gap-3 rounded-xl bg-sky-400 px-7 py-4 text-sm font-extrabold text-slate-950 transition hover:bg-sky-300"
                >
                  {esAdmin
                    ? "Ir al panel"
                    : usuario
                      ? "Reservar turno"
                      : "Comenzar ahora"}

                  <ArrowRight size={19} />
                </Link>
              )}

              <a
                href="#servicios"
                className="inline-flex items-center justify-center rounded-xl border border-white/20 px-7 py-4 text-sm font-bold text-white transition hover:bg-white/10"
              >
                Ver servicios
              </a>
            </div>

            <div className="mt-12 flex flex-wrap gap-6 text-sm text-slate-300">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={19} className="text-sky-400" />
                Reservas online
              </span>

              <span className="flex items-center gap-2">
                <CheckCircle2 size={19} className="text-sky-400" />
                Confirmación automática
              </span>
            </div>
          </div>

          {/* PANEL DESTACADO */}
          <div className="relative">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur-sm sm:p-9">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-400">
                  <Droplets size={34} />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-sky-400">
                    Nuestro lavadero
                  </p>

                  <h2 className="mt-1 text-2xl font-extrabold">
                    Lavadero Rioja
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <CarFront size={26} className="text-sky-400" />

                  <p className="mt-4 text-3xl font-extrabold">2</p>

                  <p className="mt-1 text-sm text-slate-400">
                    Puestos de lavado
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <Clock3 size={26} className="text-sky-400" />

                  <p className="mt-4 text-xl font-extrabold">Lun–Sáb</p>

                  <p className="mt-1 text-sm text-slate-400">
                    Días de atención
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3">
                  <CalendarDays size={23} className="text-sky-400" />

                  <div>
                    <p className="font-bold">Horarios de atención</p>

                    <p className="mt-1 text-sm text-slate-400">
                      09:00 a 13:00 · 16:00 a 20:00
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3 text-sm text-slate-400">
                <ShieldCheck size={20} className="text-sky-400" />
                Reservas organizadas y seguras
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ACCESOS DIRECTOS */}
      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        {!comprobandoSesion && usuario ? (
          <>
            <div className="mb-9">
              <span className="text-xs font-bold uppercase tracking-widest text-sky-600">
                {esAdmin ? "Área administrativa" : "Tu espacio personal"}
              </span>

              <h2 className="mt-3 text-3xl font-extrabold text-slate-950">
                ¡Hola, {usuario.nombre_usuario}!
              </h2>

              <p className="mt-3 text-slate-500">
                {esAdmin
                  ? "Accedé directamente a las herramientas de administración del lavadero."
                  : "Accedé a tus reservas, vehículos y datos personales desde un solo lugar."}
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {accesos.map((acceso) => (
                <TarjetaAcceso key={acceso.titulo} {...acceso} />
              ))}
            </div>
          </>
        ) : !comprobandoSesion ? (
          <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-950">
                ¿Todavía no tenés una cuenta?
              </h2>

              <p className="mt-3 max-w-xl text-slate-500">
                Registrate para guardar tus vehículos, reservar turnos y
                consultar tus lavados.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/login"
                className="rounded-xl border border-slate-200 px-6 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Iniciar sesión
              </Link>

              <Link
                to="/registro"
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-4 text-sm font-bold text-white transition hover:bg-sky-600"
              >
                <UserPlus size={19} />
                Registrarme
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <LoaderCircle className="animate-spin text-sky-500" />
            Comprobando sesión...
          </div>
        )}
      </section>

      {/* SERVICIOS */}
      <section id="servicios" className="scroll-mt-20 bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-600">
              Nuestros servicios
            </span>

            <h2 className="mt-3 text-3xl font-extrabold text-slate-950 sm:text-4xl">
              Elegí el lavado ideal
            </h2>

            <p className="mt-3 max-w-2xl text-slate-500">
              Consultá los servicios disponibles, sus precios y duración antes
              de reservar.
            </p>
          </div>

          {cargandoServicios && (
            <div className="flex items-center gap-3 py-10 text-slate-500">
              <LoaderCircle className="animate-spin text-sky-500" />
              Cargando servicios...
            </div>
          )}

          {!cargandoServicios && errorServicios && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
              <AlertCircle size={20} />
              {errorServicios}
            </div>
          )}

          {!cargandoServicios && !errorServicios && servicios.length === 0 && (
            <p className="rounded-2xl bg-slate-50 p-6 text-slate-500">
              No hay servicios disponibles actualmente.
            </p>
          )}

          {!cargandoServicios && !errorServicios && (
            <div className="grid gap-6 md:grid-cols-3">
              {servicios.map((servicio) => (
                <article
                  key={servicio.id_servicio}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-sky-200 hover:shadow-lg"
                >
                  <div className="flex h-36 items-center justify-center bg-[#081727] text-sky-400">
                    <Droplets size={65} strokeWidth={1.3} />
                  </div>

                  <div className="flex flex-1 flex-col p-7">
                    <h3 className="text-xl font-extrabold text-slate-950">
                      {servicio.nombre}
                    </h3>

                    <p className="mt-3 min-h-16 text-sm leading-6 text-slate-500">
                      {servicio.descripcion ||
                        "Servicio de lavado para tu vehículo."}
                    </p>

                    <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
                      <Clock3 size={18} className="text-sky-600" />
                      {servicio.duracion_minutos} minutos
                    </div>

                    <div className="mt-6 border-t border-slate-100 pt-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Precio
                      </p>

                      <p className="mt-2 text-3xl font-extrabold text-slate-950">
                        {formatearPrecio(servicio.precio)}
                      </p>
                    </div>

                    <Link
                      to={
                        esAdmin
                          ? "/admin/servicios"
                          : usuario
                            ? "/reservar-turno"
                            : "/registro"
                      }
                      className="mt-7 flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-sky-600"
                    >
                      {esAdmin
                        ? "Administrar servicio"
                        : "Reservar este lavado"}

                      <ArrowRight size={18} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="scroll-mt-20 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-12 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-600">
              Reservas online
            </span>

            <h2 className="mt-3 text-3xl font-extrabold text-slate-950 sm:text-4xl">
              Reservar es muy sencillo
            </h2>

            <p className="mt-3 text-slate-500">
              Organizá el lavado de tu vehículo en tres pasos.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                numero: "01",
                icono: CarFront,
                titulo: "Registrá tu vehículo",
                descripcion:
                  "Creá tu cuenta y agregá el auto que querés llevar al lavadero.",
              },
              {
                numero: "02",
                icono: CalendarDays,
                titulo: "Elegí fecha y horario",
                descripcion:
                  "Seleccioná el servicio y consultá los turnos disponibles.",
              },
              {
                numero: "03",
                icono: CheckCircle2,
                titulo: "Confirmá tu reserva",
                descripcion:
                  "El sistema asigna automáticamente un puesto disponible.",
              },
            ].map((paso) => {
              const Icono = paso.icono;

              return (
                <div
                  key={paso.numero}
                  className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
                >
                  <div className="mb-7 flex items-center justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                      <Icono size={28} />
                    </div>

                    <span className="text-4xl font-extrabold text-slate-100">
                      {paso.numero}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-slate-950">
                    {paso.titulo}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-500">
                    {paso.descripcion}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 text-center">
            <Link
              to={
                usuario ? (esAdmin ? "/admin" : "/reservar-turno") : "/registro"
              }
              className="inline-flex items-center gap-2 rounded-xl bg-[#081727] px-8 py-4 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              {esAdmin ? "Ir a administración" : "Reservar mi turno"}

              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* PIE PROMOCIONAL */}
      <section className="bg-[#081727] px-6 py-14 text-center text-white">
        <Droplets size={34} className="mx-auto text-sky-400" />

        <h2 className="mt-5 text-2xl font-extrabold sm:text-3xl">
          Lavadero Rioja
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-400">
          Tu tiempo importa. Reservá online y disfrutá de una atención más
          organizada.
        </p>
      </section>
    </div>
  );
}

export default Inicio;
