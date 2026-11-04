import { useEffect, useState } from "react";
import {
  Droplets,
  CarFront,
  Sparkles,
  Clock3,
  ArrowRight,
  CalendarDays,
  ShieldCheck,
  MapPin,
  LoaderCircle,
  CheckCircle2,
} from "lucide-react";

function Inicio() {
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function cargarServicios() {
      try {
        const respuesta = await fetch(
          `${import.meta.env.VITE_API_URL}/api/servicios`,
          {
            signal: controller.signal,
          },
        );

        if (!respuesta.ok) {
          throw new Error("Error al cargar los servicios");
        }

        const datos = await respuesta.json();
        setServicios(datos);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError("No se pudieron cargar los servicios.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }

    cargarServicios();
    return () => controller.abort();
  }, []);

  const formatearPrecio = (precio) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(Number(precio));

  const obtenerIcono = (nombre) => {
    const texto = nombre.toLowerCase();

    if (texto.includes("premium")) return Sparkles;
    if (texto.includes("completo")) return CarFront;
    return Droplets;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main>
        {/* HERO */}
        <section
          id="inicio"
          className="relative overflow-hidden bg-[#081727] text-white"
        >
          <div className="pointer-events-none absolute -right-24 top-12 h-96 w-96 rounded-full bg-sky-400/15 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/4 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />

          <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
            <div>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-4 py-2 text-xs font-semibold text-sky-300">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                CUIDAMOS CADA DETALLE DE TU AUTO
              </div>

              <h1 className="max-w-2xl text-5xl font-extrabold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
                Tu auto limpio.
                <span className="mt-2 block text-sky-400">Tu tiempo vale.</span>
              </h1>

              <p className="mt-7 max-w-lg text-lg leading-8 text-slate-400">
                Descubrí una nueva forma de cuidar tu vehículo. Servicios
                profesionales de lavado y una experiencia simple, rápida y
                cómoda.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <a
                  href="#servicios"
                  className="inline-flex items-center gap-3 rounded-xl bg-sky-400 px-7 py-4 text-sm font-bold text-slate-950 shadow-lg shadow-sky-400/10 transition hover:bg-sky-300"
                >
                  Explorar servicios
                  <ArrowRight size={18} />
                </a>

                <a
                  href="#como-funciona"
                  className="inline-flex items-center rounded-xl border border-white/20 px-7 py-4 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Cómo funciona
                </a>
              </div>

              <div className="mt-12 flex flex-wrap gap-6 text-sm text-slate-400">
                <span className="flex items-center gap-2">
                  <MapPin size={17} className="text-sky-400" />
                  La Rioja, Argentina
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle2 size={17} className="text-sky-400" />
                  Atención de lunes a sábado
                </span>
              </div>
            </div>

            {/* TARJETA ILUSTRATIVA */}
            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -inset-5 rounded-[40px] bg-sky-400/10 blur-3xl" />

              <div className="relative rounded-[30px] border border-white/15 bg-white/[0.07] p-5 shadow-2xl backdrop-blur-xl sm:p-7">
                <div className="mb-7 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-sky-300">
                      EXPERIENCIA LAVADERO RIOJA
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">
                      Tu próximo lavado
                    </h2>
                  </div>
                  <div className="rounded-2xl bg-sky-400/15 p-3 text-sky-400">
                    <CarFront size={28} />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/10 p-4">
                    <div className="rounded-xl bg-sky-400/15 p-3 text-sky-400">
                      <Droplets size={22} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">Elegí tu servicio</p>
                      <p className="text-xs text-slate-400">
                        Exterior, completo o premium
                      </p>
                    </div>
                    <CheckCircle2 size={20} className="text-sky-400" />
                  </div>

                  <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="rounded-xl bg-white/10 p-3 text-slate-300">
                      <CalendarDays size={22} />
                    </div>
                    <div>
                      <p className="font-semibold">Seleccioná un horario</p>
                      <p className="text-xs text-slate-400">
                        Disponibilidad en tiempo real
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="rounded-xl bg-white/10 p-3 text-slate-300">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <p className="font-semibold">Confirmá tu turno</p>
                      <p className="text-xs text-slate-400">
                        Sin llamadas ni esperas
                      </p>
                    </div>
                  </div>
                </div>

                <p className="mt-6 text-center text-xs text-slate-400">
                  Vista previa del futuro sistema de reservas
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SERVICIOS */}
        <section
          id="servicios"
          className="mx-auto max-w-7xl scroll-mt-20 px-6 py-24 lg:px-8"
        >
          <div className="mb-12 max-w-2xl">
            <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-sky-600">
              Nuestros servicios
            </span>

            <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950 sm:text-5xl">
              El cuidado que tu auto merece.
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-500">
              Elegí el servicio que mejor se adapte a tu vehículo. Precios
              claros y diferentes opciones de limpieza.
            </p>
          </div>

          {cargando && (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
              <LoaderCircle className="animate-spin text-sky-500" />
              Cargando servicios...
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 p-5 text-red-600">{error}</p>
          )}

          {!cargando && !error && servicios.length === 0 && (
            <p className="text-slate-500">No hay servicios disponibles.</p>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {servicios.map((servicio) => {
              const Icono = obtenerIcono(servicio.nombre);

              return (
                <article
                  key={servicio.id_servicio}
                  className="group flex flex-col rounded-[26px] border border-slate-200 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-sky-300 hover:shadow-xl hover:shadow-slate-200/60"
                >
                  <div className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 transition group-hover:bg-sky-500 group-hover:text-white">
                    <Icono size={29} strokeWidth={1.8} />
                  </div>

                  <h3 className="text-2xl font-bold tracking-tight text-slate-900">
                    {servicio.nombre}
                  </h3>

                  <p className="mt-4 flex-1 leading-7 text-slate-500">
                    {servicio.descripcion}
                  </p>

                  <div className="mt-8 flex items-center gap-2 text-sm text-slate-500">
                    <Clock3 size={17} className="text-sky-600" />
                    {servicio.duracion_minutos} minutos
                  </div>

                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Precio del servicio
                    </p>
                    <p className="text-3xl font-extrabold tracking-tight text-slate-950">
                      {formatearPrecio(servicio.precio)}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section id="como-funciona" className="scroll-mt-20 bg-white py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="text-center">
              <span className="text-xs font-extrabold uppercase tracking-[0.2em] text-sky-600">
                Próximamente
              </span>

              <h2 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-950">
                Reservar será muy fácil.
              </h2>

              <p className="mx-auto mt-5 max-w-xl text-slate-500">
                Estamos preparando un sistema para que puedas reservar tu
                próximo lavado desde cualquier dispositivo.
              </p>
            </div>

            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {[
                {
                  numero: "01",
                  titulo: "Elegí tu lavado",
                  descripcion: "Seleccioná el servicio ideal para tu vehículo.",
                  icono: Droplets,
                },
                {
                  numero: "02",
                  titulo: "Buscá un horario",
                  descripcion:
                    "Consultá los turnos disponibles en el calendario.",
                  icono: CalendarDays,
                },
                {
                  numero: "03",
                  titulo: "Confirmá tu reserva",
                  descripcion: "Tu turno quedará registrado automáticamente.",
                  icono: CheckCircle2,
                },
              ].map((paso) => {
                const Icono = paso.icono;

                return (
                  <div key={paso.numero} className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-sky-600">
                      <Icono size={29} />
                    </div>

                    <p className="mt-6 text-xs font-bold tracking-widest text-sky-600">
                      PASO {paso.numero}
                    </p>

                    <h3 className="mt-3 text-xl font-bold text-slate-900">
                      {paso.titulo}
                    </h3>

                    <p className="mx-auto mt-3 max-w-xs leading-7 text-slate-500">
                      {paso.descripcion}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Inicio;
