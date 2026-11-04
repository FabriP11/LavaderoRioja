import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import {
  CalendarDays,
  CarFront,
  Clock3,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Droplets,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

// Fecha actual según la hora de La Rioja
function obtenerFechaArgentina() {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Argentina/La_Rioja",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((parte) => [parte.type, parte.value]),
  );

  return `${partes.year}-${partes.month}-${partes.day}`;
}

function ReservarTurno() {
  const { usuario, comprobandoSesion } = useAuth();

  const [vehiculos, setVehiculos] = useState([]);
  const [servicios, setServicios] = useState([]);

  const [idVehiculo, setIdVehiculo] = useState("");
  const [idServicio, setIdServicio] = useState("");
  const [fecha, setFecha] = useState(obtenerFechaArgentina);
  const [hora, setHora] = useState("");

  const [horarios, setHorarios] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [errorDatos, setErrorDatos] = useState("");
  const [errorHorarios, setErrorHorarios] = useState("");
  const [errorReserva, setErrorReserva] = useState("");

  const [confirmacion, setConfirmacion] = useState(null);
  const [actualizacion, setActualizacion] = useState(0);

  const hoy = obtenerFechaArgentina();

  // 1. Cargar los vehículos y servicios
  useEffect(() => {
    if (comprobandoSesion || !usuario) return;

    const controller = new AbortController();

    async function cargarDatos() {
      setCargandoDatos(true);
      setErrorDatos("");

      try {
        const [respuestaVehiculos, respuestaServicios] = await Promise.all([
          fetch(`${API_URL}/api/vehiculos`, {
            credentials: "include",
            signal: controller.signal,
          }),
          fetch(`${API_URL}/api/servicios`, {
            signal: controller.signal,
          }),
        ]);

        if (!respuestaVehiculos.ok || !respuestaServicios.ok) {
          throw new Error("No se pudieron cargar los vehículos o servicios.");
        }

        const datosVehiculos = await respuestaVehiculos.json();
        const datosServicios = await respuestaServicios.json();

        // Aceptar respuestas como array o como objeto
        const listaVehiculos = Array.isArray(datosVehiculos)
          ? datosVehiculos
          : datosVehiculos.vehiculos;

        const listaServicios = Array.isArray(datosServicios)
          ? datosServicios
          : datosServicios.servicios;

        if (!Array.isArray(listaVehiculos) || !Array.isArray(listaServicios)) {
          throw new Error(
            "El servidor devolvió un formato de datos inesperado.",
          );
        }

        if (!controller.signal.aborted) {
          setVehiculos(listaVehiculos);

          setServicios(
            listaServicios.filter(
              (servicio) => Number(servicio.activo ?? 1) === 1,
            ),
          );
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorDatos(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoDatos(false);
        }
      }
    }

    cargarDatos();

    return () => controller.abort();
  }, [usuario, comprobandoSesion]);

  // 2. Consultar horarios al cambiar servicio o fecha
  useEffect(() => {
    if (comprobandoSesion || !usuario || !idServicio || !fecha) {
      setHorarios([]);
      return;
    }

    const controller = new AbortController();

    async function consultarDisponibilidad() {
      setCargandoHorarios(true);
      setErrorHorarios("");
      setHorarios([]);

      try {
        const parametros = new URLSearchParams({
          fecha,
          id_servicio: idServicio,
        });

        const respuesta = await fetch(
          `${API_URL}/api/disponibilidad?${parametros}`,
          {
            signal: controller.signal,
          },
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.mensaje || "No se pudo consultar la disponibilidad.",
          );
        }

        if (!controller.signal.aborted) {
          setHorarios(Array.isArray(datos.horarios) ? datos.horarios : []);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorHorarios(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoHorarios(false);
        }
      }
    }

    consultarDisponibilidad();

    return () => controller.abort();
  }, [usuario, comprobandoSesion, idServicio, fecha, actualizacion]);

  // 3. Crear reserva
  const manejarReserva = async (e) => {
    e.preventDefault();

    if (!idVehiculo || !idServicio || !fecha || !hora) {
      setErrorReserva("Completá todos los datos de la reserva.");
      return;
    }

    setGuardando(true);
    setErrorReserva("");
    setConfirmacion(null);

    try {
      const respuesta = await fetch(`${API_URL}/api/turnos`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_vehiculo: Number(idVehiculo),
          id_servicio: Number(idServicio),
          fecha,
          hora_inicio: hora,
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(resultado.mensaje || "No se pudo confirmar el turno.");
      }

      setConfirmacion(resultado.turno);
      setHora("");

      // Volver a consultar disponibilidad
      setActualizacion((anterior) => anterior + 1);
    } catch (error) {
      setErrorReserva(error.message);
    } finally {
      setGuardando(false);
    }
  };

  if (comprobandoSesion) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3">
        <LoaderCircle className="animate-spin text-sky-500" />
        Comprobando sesión...
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  const servicioSeleccionado = servicios.find(
    (servicio) => String(servicio.id_servicio) === idServicio,
  );

  const cantidadDisponibles = horarios.filter(
    (horario) => horario.disponible,
  ).length;

  return (
    <section className="min-h-screen bg-slate-50 px-6 py-12 lg:py-16">
      <div className="mx-auto max-w-5xl">
        {/* ENCABEZADO */}
        <div className="mb-10">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
            Reservas online
          </span>

          <h1 className="mt-3 text-4xl font-extrabold text-slate-950">
            Reservar turno
          </h1>

          <p className="mt-3 text-slate-500">
            Elegí tu vehículo, seleccioná un lavado y encontrá el mejor horario
            disponible.
          </p>
        </div>

        {/* CONFIRMACIÓN */}
        {confirmacion && (
          <div
            role="status"
            className="mb-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-7"
          >
            <div className="flex items-start gap-4">
              <CheckCircle2 size={30} className="shrink-0 text-emerald-600" />

              <div>
                <h2 className="text-xl font-bold text-emerald-900">
                  ¡Turno reservado correctamente!
                </h2>

                <p className="mt-2 text-sm text-emerald-800">
                  Reserva #{confirmacion.id_turno}
                </p>

                <p className="mt-2 text-sm text-emerald-800">
                  {confirmacion.fecha} · {confirmacion.hora_inicio} a{" "}
                  {confirmacion.hora_fin}
                </p>

                <p className="mt-1 text-sm text-emerald-800">
                  Puesto {confirmacion.id_puesto} · {confirmacion.servicio}
                </p>

                <p className="mt-3 text-sm font-bold text-emerald-900">
                  Estado: Confirmado
                </p>
              </div>
            </div>
          </div>
        )}

        {cargandoDatos ? (
          <div className="flex items-center justify-center gap-3 rounded-3xl bg-white p-12 text-slate-500">
            <LoaderCircle className="animate-spin text-sky-500" />
            Cargando datos...
          </div>
        ) : errorDatos ? (
          <div role="alert" className="rounded-2xl bg-red-50 p-6 text-red-700">
            {errorDatos}
          </div>
        ) : (
          <form onSubmit={manejarReserva} className="space-y-8">
            {/* VEHÍCULO */}
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
              <div className="mb-6 flex items-center gap-3">
                <CarFront size={25} className="text-sky-600" />

                <h2 className="text-xl font-bold text-slate-950">
                  1. Seleccioná tu vehículo
                </h2>
              </div>

              {vehiculos.length === 0 ? (
                <div className="rounded-xl bg-sky-50 p-5 text-sm text-slate-700">
                  Todavía no registraste vehículos.{" "}
                  <Link
                    to="/mis-vehiculos"
                    className="font-bold text-sky-600 underline"
                  >
                    Agregar vehículo
                  </Link>
                </div>
              ) : (
                <select
                  value={idVehiculo}
                  onChange={(e) => {
                    setIdVehiculo(e.target.value);
                    setConfirmacion(null);
                    setErrorReserva("");
                  }}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                >
                  <option value="">Elegí un vehículo</option>

                  {vehiculos.map((vehiculo) => (
                    <option
                      key={vehiculo.id_vehiculo}
                      value={vehiculo.id_vehiculo}
                    >
                      {vehiculo.marca} {vehiculo.modelo} — {vehiculo.patente}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* SERVICIO */}
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
              <div className="mb-6 flex items-center gap-3">
                <Droplets size={25} className="text-sky-600" />

                <h2 className="text-xl font-bold text-slate-950">
                  2. Elegí el servicio
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {servicios.map((servicio) => {
                  const seleccionado =
                    idServicio === String(servicio.id_servicio);

                  return (
                    <button
                      key={servicio.id_servicio}
                      type="button"
                      onClick={() => {
                        setIdServicio(String(servicio.id_servicio));
                        setHora("");
                        setConfirmacion(null);
                        setErrorReserva("");
                      }}
                      className={`rounded-2xl border-2 p-5 text-left transition ${
                        seleccionado
                          ? "border-sky-500 bg-sky-50"
                          : "border-slate-200 bg-white hover:border-sky-200"
                      }`}
                    >
                      <h3 className="font-bold text-slate-950">
                        {servicio.nombre}
                      </h3>

                      <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                        <Clock3 size={16} />
                        {servicio.duracion_minutos} minutos
                      </div>

                      <p className="mt-4 text-xl font-extrabold text-sky-600">
                        {Number(servicio.precio).toLocaleString("es-AR", {
                          style: "currency",
                          currency: "ARS",
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FECHA Y HORA */}
            <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-9">
              <div className="mb-6 flex items-center gap-3">
                <CalendarDays size={25} className="text-sky-600" />

                <h2 className="text-xl font-bold text-slate-950">
                  3. Seleccioná fecha y horario
                </h2>
              </div>

              <label
                htmlFor="fechaReserva"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Fecha del lavado
              </label>

              <input
                id="fechaReserva"
                type="date"
                min={hoy}
                value={fecha}
                onChange={(e) => {
                  setFecha(e.target.value);
                  setHora("");
                  setConfirmacion(null);
                  setErrorReserva("");
                }}
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 sm:max-w-xs"
              />

              <div className="mt-8 border-t border-slate-100 pt-7">
                <h3 className="mb-4 font-bold text-slate-900">
                  Horarios disponibles
                </h3>

                {!idServicio ? (
                  <p className="text-sm text-slate-500">
                    Primero seleccioná un servicio para consultar los horarios.
                  </p>
                ) : cargandoHorarios ? (
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <LoaderCircle
                      size={19}
                      className="animate-spin text-sky-500"
                    />
                    Consultando disponibilidad...
                  </div>
                ) : errorHorarios ? (
                  <p role="alert" className="text-sm text-red-600">
                    {errorHorarios}
                  </p>
                ) : horarios.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No hay horarios para esta fecha. Probá con otro día.
                  </p>
                ) : (
                  <>
                    <p className="mb-5 text-sm text-slate-500">
                      {cantidadDisponibles} horarios con disponibilidad. Los
                      horarios ocupados aparecen deshabilitados.
                    </p>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                      {horarios.map((horario) => {
                        const seleccionado = hora === horario.hora_inicio;

                        return (
                          <button
                            key={horario.hora_inicio}
                            type="button"
                            disabled={!horario.disponible}
                            onClick={() => {
                              setHora(horario.hora_inicio);
                              setErrorReserva("");
                              setConfirmacion(null);
                            }}
                            className={`rounded-xl border-2 px-3 py-4 text-center transition ${
                              !horario.disponible
                                ? "cursor-not-allowed border-slate-100 bg-slate-100 text-slate-400"
                                : seleccionado
                                  ? "border-sky-500 bg-sky-50 text-sky-700"
                                  : "border-slate-200 bg-white text-slate-800 hover:border-sky-300"
                            }`}
                          >
                            <span className="block text-lg font-bold">
                              {horario.hora_inicio}
                            </span>

                            <span className="mt-1 block text-xs">
                              {horario.disponible
                                ? `${horario.puestos_disponibles} puesto(s) libres`
                                : "Sin cupos"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* RESUMEN */}
            {servicioSeleccionado && hora && (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-6">
                <h3 className="font-bold text-slate-950">
                  Resumen de tu reserva
                </h3>

                <p className="mt-3 text-sm text-slate-700">
                  {servicioSeleccionado.nombre} · {fecha} · {hora} ·{" "}
                  {servicioSeleccionado.duracion_minutos} min
                </p>
              </div>
            )}

            {/* ERROR */}
            {errorReserva && (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl bg-red-50 p-5 text-sm text-red-700"
              >
                <AlertCircle size={20} className="shrink-0" />
                {errorReserva}
              </div>
            )}

            {/* CONFIRMAR */}
            <button
              type="submit"
              disabled={
                guardando ||
                cargandoHorarios ||
                !idVehiculo ||
                !idServicio ||
                !hora
              }
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-sky-500 px-6 py-5 text-sm font-extrabold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {guardando ? (
                <>
                  <LoaderCircle size={20} className="animate-spin" />
                  Confirmando reserva...
                </>
              ) : (
                <>
                  <CheckCircle2 size={20} />
                  Confirmar reserva
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

export default ReservarTurno;
