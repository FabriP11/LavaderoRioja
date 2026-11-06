import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";

import {
  CalendarDays,
  CarFront,
  Clock3,
  ArrowLeft,
  RefreshCw,
  LoaderCircle,
  AlertCircle,
  Wrench,
  UserRound,
  Droplets,
  ShieldCheck,
  Plus,
  Trash2,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

// Obtener la fecha actual de Argentina
function obtenerFechaHoy() {
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

function formatearFecha(fecha) {
  if (!fecha) return "";

  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

// MySQL devuelve: 2026-10-29 10:00:00
function obtenerHora(fechaHora) {
  if (!fechaHora) return "--:--";
  return fechaHora.slice(11, 16);
}

const estilosEstado = {
  reservado: {
    texto: "Reservado",
    clase: "bg-sky-100 text-sky-700",
  },
  en_proceso: {
    texto: "En proceso",
    clase: "bg-amber-100 text-amber-700",
  },
  finalizado: {
    texto: "Finalizado",
    clase: "bg-emerald-100 text-emerald-700",
  },
  entregado: {
    texto: "Entregado",
    clase: "bg-teal-100 text-teal-700",
  },
  cancelado: {
    texto: "Cancelado",
    clase: "bg-red-100 text-red-700",
  },
};

function AgendaAdmin() {
  const { usuario, comprobandoSesion } = useAuth();

  const [fecha, setFecha] = useState(obtenerFechaHoy);
  const [puestos, setPuestos] = useState([]);

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [actualizacion, setActualizacion] = useState(0);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [nuevoBloqueo, setNuevoBloqueo] = useState({
    id_puesto: "",
    hora_inicio: "09:00",
    hora_fin: "10:00",
    motivo: "",
  });

  const [guardandoBloqueo, setGuardandoBloqueo] = useState(false);
  const [errorBloqueo, setErrorBloqueo] = useState("");
  const [mensajeBloqueo, setMensajeBloqueo] = useState("");

  const [eliminandoBloqueoId, setEliminandoBloqueoId] = useState(null);

  const [errorEliminarBloqueo, setErrorEliminarBloqueo] = useState("");

  // Consultar agenda de ambos puestos
  useEffect(() => {
    if (
      comprobandoSesion ||
      !usuario ||
      usuario.rol !== "administrador" ||
      !fecha
    ) {
      return;
    }

    const controller = new AbortController();

    async function obtenerAgenda() {
      setCargando(true);
      setError("");

      try {
        const parametros = new URLSearchParams({
          fecha,
        });

        const respuesta = await fetch(
          `${API_URL}/api/admin/agenda?${parametros}`,
          {
            credentials: "include",
            signal: controller.signal,
          },
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(datos.mensaje || "No se pudo cargar la agenda.");
        }

        if (!controller.signal.aborted) {
          setPuestos(Array.isArray(datos.puestos) ? datos.puestos : []);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setPuestos([]);

          setError(
            error instanceof TypeError
              ? "No se pudo conectar con el servidor."
              : error.message,
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }

    obtenerAgenda();

    return () => controller.abort();
  }, [usuario, comprobandoSesion, fecha, actualizacion]);

  const guardarBloqueo = async (e) => {
    e.preventDefault();

    setErrorBloqueo("");
    setMensajeBloqueo("");

    if (!nuevoBloqueo.id_puesto) {
      setErrorBloqueo("Seleccioná un puesto.");
      return;
    }

    setGuardandoBloqueo(true);

    try {
      const respuesta = await fetch(`${API_URL}/api/admin/bloqueos`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_puesto:
            nuevoBloqueo.id_puesto === "todos"
              ? null
              : Number(nuevoBloqueo.id_puesto),
          fecha,
          hora_inicio: nuevoBloqueo.hora_inicio,
          hora_fin: nuevoBloqueo.hora_fin,
          motivo: nuevoBloqueo.motivo,
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(resultado.mensaje || "No se pudo crear el bloqueo.");
      }

      setMensajeBloqueo("¡Horario bloqueado correctamente!");
      setMostrarFormulario(false);

      setNuevoBloqueo({
        id_puesto: "",
        hora_inicio: "09:00",
        hora_fin: "10:00",
        motivo: "",
      });

      // Actualizar las agendas de ambos puestos
      setActualizacion((anterior) => anterior + 1);
    } catch (error) {
      setErrorBloqueo(
        error instanceof TypeError
          ? "No se pudo conectar con el servidor."
          : error.message,
      );
    } finally {
      setGuardandoBloqueo(false);
    }
  };

  const eliminarBloqueo = async (bloqueo) => {
    const confirmar = window.confirm(
      `¿Estás seguro de eliminar el bloqueo "${bloqueo.motivo}"?`,
    );

    if (!confirmar) return;

    setEliminandoBloqueoId(bloqueo.id_bloqueo);
    setErrorEliminarBloqueo("");
    setMensajeBloqueo("");

    try {
      const respuesta = await fetch(
        `${API_URL}/api/admin/bloqueos/${bloqueo.id_bloqueo}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(resultado.mensaje || "No se pudo eliminar el bloqueo.");
      }

      setMensajeBloqueo("¡Bloqueo eliminado correctamente!");

      // Consultar nuevamente la agenda
      setActualizacion((anterior) => anterior + 1);
    } catch (error) {
      setErrorEliminarBloqueo(
        error instanceof TypeError
          ? "No se pudo conectar con el servidor."
          : error.message,
      );
    } finally {
      setEliminandoBloqueoId(null);
    }
  };

  // Comprobar permisos
  if (comprobandoSesion) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-500">
        <LoaderCircle className="animate-spin text-sky-500" />
        Comprobando permisos...
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (usuario.rol !== "administrador") {
    return <Navigate to="/" replace />;
  }

  // Contar reservas sin duplicarlas
  const turnosDelDia = puestos.flatMap((puesto) => puesto.turnos || []);

  const cantidadReservas = turnosDelDia.filter(
    (turno) => turno.estado !== "cancelado",
  ).length;

  const cantidadCanceladas = turnosDelDia.filter(
    (turno) => turno.estado === "cancelado",
  ).length;

  const cantidadBloqueos = new Set(
    puestos
      .flatMap((puesto) => puesto.bloqueos || [])
      .map((bloqueo) => bloqueo.id_bloqueo),
  ).size;

  return (
    <section className="min-h-screen bg-slate-50 px-6 py-12 lg:py-16">
      <div className="mx-auto max-w-7xl">
        {/* VOLVER */}
        <Link
          to="/admin"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-sky-600"
        >
          <ArrowLeft size={18} />
          Volver al panel
        </Link>

        {/* ENCABEZADO */}
        <div className="mb-9">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
            Administración · Lavadero Rioja
          </span>

          <h1 className="mt-3 text-4xl font-extrabold text-slate-950">
            Agenda de puestos
          </h1>

          <p className="mt-3 text-slate-500">
            Consultá las reservas y los bloqueos de los dos puestos de lavado.
          </p>
        </div>

        {/* SELECTOR DE FECHA */}
        <div className="mb-8 flex flex-wrap items-end gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex-1">
            <label
              htmlFor="fechaAgenda"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Fecha de la agenda
            </label>

            <input
              id="fechaAgenda"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-sky-400 sm:max-w-xs"
            />
          </div>

          <button
            type="button"
            onClick={() => setFecha(obtenerFechaHoy())}
            className="rounded-xl border border-slate-200 px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Hoy
          </button>

          <button
            type="button"
            disabled={cargando}
            onClick={() => setActualizacion((anterior) => anterior + 1)}
            className="flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-sky-600 disabled:opacity-50"
          >
            <RefreshCw size={18} className={cargando ? "animate-spin" : ""} />
            Actualizar
          </button>

          <button
            type="button"
            onClick={() => {
              setMostrarFormulario(!mostrarFormulario);
              setErrorBloqueo("");
              setMensajeBloqueo("");
            }}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-amber-600"
          >
            <Plus size={18} />

            {mostrarFormulario ? "Cerrar formulario" : "Bloquear horario"}
          </button>
        </div>

        {/* ERROR AL ELIMINAR BLOQUEO */}
        {errorEliminarBloqueo && (
          <div
            role="alert"
            className="mb-8 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
          >
            <AlertCircle size={19} />
            {errorEliminarBloqueo}
          </div>
        )}

        {/* MENSAJE DE ÉXITO */}
        {mensajeBloqueo && (
          <div
            role="status"
            className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700"
          >
            {mensajeBloqueo}
          </div>
        )}

        {/* FORMULARIO DE BLOQUEO */}
        {mostrarFormulario && (
          <div className="mb-8 rounded-3xl border border-amber-200 bg-white p-7 shadow-sm sm:p-9">
            <div className="mb-7 flex items-center gap-3">
              <Wrench size={26} className="text-amber-600" />

              <div>
                <h2 className="text-xl font-extrabold text-slate-950">
                  Bloquear horario
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Fecha seleccionada: {formatearFecha(fecha)}
                </p>
              </div>
            </div>

            <form onSubmit={guardarBloqueo} className="space-y-6">
              {/* PUESTO */}
              <div>
                <label
                  htmlFor="puestoBloqueo"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Puesto de lavado
                </label>

                <select
                  id="puestoBloqueo"
                  value={nuevoBloqueo.id_puesto}
                  onChange={(e) =>
                    setNuevoBloqueo((anterior) => ({
                      ...anterior,
                      id_puesto: e.target.value,
                    }))
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none focus:border-amber-400"
                >
                  <option value="">Seleccioná una opción</option>

                  {puestos
                    .filter((puesto) => Number(puesto.activo) === 1)
                    .map((puesto) => (
                      <option key={puesto.id_puesto} value={puesto.id_puesto}>
                        {puesto.nombre}
                      </option>
                    ))}

                  <option value="todos">Ambos puestos (cierre general)</option>
                </select>
              </div>

              {/* HORARIOS */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="horaInicioBloqueo"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Hora de inicio
                  </label>

                  <input
                    id="horaInicioBloqueo"
                    type="time"
                    value={nuevoBloqueo.hora_inicio}
                    onChange={(e) =>
                      setNuevoBloqueo((anterior) => ({
                        ...anterior,
                        hora_inicio: e.target.value,
                      }))
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label
                    htmlFor="horaFinBloqueo"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Hora de finalización
                  </label>

                  <input
                    id="horaFinBloqueo"
                    type="time"
                    value={nuevoBloqueo.hora_fin}
                    onChange={(e) =>
                      setNuevoBloqueo((anterior) => ({
                        ...anterior,
                        hora_fin: e.target.value,
                      }))
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* MOTIVO */}
              <div>
                <label
                  htmlFor="motivoBloqueo"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Motivo
                </label>

                <input
                  id="motivoBloqueo"
                  type="text"
                  value={nuevoBloqueo.motivo}
                  onChange={(e) =>
                    setNuevoBloqueo((anterior) => ({
                      ...anterior,
                      motivo: e.target.value,
                    }))
                  }
                  placeholder="Ej.: mantenimiento del equipo"
                  maxLength={150}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none focus:border-amber-400"
                />
              </div>

              {errorBloqueo && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700"
                >
                  <AlertCircle size={19} className="shrink-0" />
                  {errorBloqueo}
                </div>
              )}

              <div className="flex justify-end border-t border-slate-100 pt-6">
                <button
                  type="submit"
                  disabled={guardandoBloqueo || cargando || !fecha}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-4 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"
                >
                  {guardandoBloqueo ? (
                    <>
                      <LoaderCircle size={19} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Wrench size={19} />
                      Confirmar bloqueo
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* RESUMEN */}
        {!cargando && !error && (
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <TarjetaResumen
              icono={CalendarDays}
              titulo="Reservas del día"
              cantidad={cantidadReservas}
            />

            <TarjetaResumen
              icono={Wrench}
              titulo="Bloqueos"
              cantidad={cantidadBloqueos}
            />

            <TarjetaResumen
              icono={Clock3}
              titulo="Turnos cancelados"
              cantidad={cantidadCanceladas}
            />
          </div>
        )}

        {/* CARGANDO */}
        {cargando && (
          <div className="flex min-h-64 items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white text-slate-500">
            <LoaderCircle className="animate-spin text-sky-500" />
            Cargando agenda...
          </div>
        )}

        {/* ERROR */}
        {!cargando && error && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"
          >
            <AlertCircle size={22} />
            {error}
          </div>
        )}

        {/* AGENDA DE LOS DOS PUESTOS */}
        {!cargando && !error && (
          <>
            <h2 className="mb-6 text-xl font-bold text-slate-950">
              Agenda del {formatearFecha(fecha)}
            </h2>

            {puestos.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500">
                No se encontraron puestos de lavado.
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                {puestos.map((puesto) => {
                  const turnos = puesto.turnos || [];
                  const bloqueos = puesto.bloqueos || [];

                  const reservasActivas = turnos.filter(
                    (turno) => turno.estado !== "cancelado",
                  ).length;

                  return (
                    <article
                      key={puesto.id_puesto}
                      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                    >
                      {/* CABECERA DEL PUESTO */}
                      <div className="bg-[#081727] p-7 text-white">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-400">
                              <CarFront size={30} />
                            </div>

                            <div>
                              <h3 className="text-2xl font-extrabold">
                                {puesto.nombre}
                              </h3>

                              <p className="mt-1 text-sm text-slate-400">
                                {reservasActivas} reservas
                              </p>
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                              Number(puesto.activo) === 1
                                ? "bg-emerald-400/15 text-emerald-300"
                                : "bg-red-400/15 text-red-300"
                            }`}
                          >
                            {Number(puesto.activo) === 1
                              ? "Habilitado"
                              : "Deshabilitado"}
                          </span>
                        </div>
                      </div>

                      {/* CONTENIDO */}
                      <div className="space-y-5 p-6">
                        {/* BLOQUEOS */}
                        {bloqueos.map((bloqueo) => (
                          <div
                            key={bloqueo.id_bloqueo}
                            className="rounded-2xl border border-amber-200 bg-amber-50 p-5"
                          >
                            <div className="flex items-center gap-2 text-amber-800">
                              <Wrench size={20} />

                              <span className="font-bold">
                                Horario bloqueado
                              </span>
                            </div>

                            <p className="mt-3 text-lg font-extrabold text-slate-900">
                              {obtenerHora(bloqueo.inicio)} a{" "}
                              {obtenerHora(bloqueo.fin)}
                            </p>

                            <p className="mt-2 text-sm text-slate-600">
                              {bloqueo.motivo}
                            </p>

                            <p className="mt-2 text-xs font-medium text-amber-700">
                              {bloqueo.id_puesto === null
                                ? "Cierre general"
                                : "Bloqueo del puesto"}
                            </p>

                            {/* BOTÓN ELIMINAR BLOQUEO */}
                            <button
                              type="button"
                              onClick={() => eliminarBloqueo(bloqueo)}
                              disabled={eliminandoBloqueoId !== null}
                              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 size={17} />

                              {eliminandoBloqueoId === bloqueo.id_bloqueo
                                ? "Eliminando..."
                                : "Eliminar bloqueo"}
                            </button>
                          </div>
                        ))}

                        {/* RESERVAS */}
                        {turnos.map((turno) => {
                          const estado = estilosEstado[turno.estado] || {
                            texto: turno.estado,
                            clase: "bg-slate-100 text-slate-600",
                          };

                          return (
                            <div
                              key={turno.id_turno}
                              className={`rounded-2xl border p-5 ${
                                turno.estado === "cancelado"
                                  ? "border-slate-200 bg-slate-50 opacity-70"
                                  : "border-slate-200 bg-white"
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                    Reserva #{turno.id_turno}
                                  </p>

                                  <h4 className="mt-2 text-xl font-extrabold text-slate-950">
                                    {obtenerHora(turno.inicio)} a{" "}
                                    {obtenerHora(turno.fin)}
                                  </h4>
                                </div>

                                <span
                                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${estado.clase}`}
                                >
                                  {estado.texto}
                                </span>
                              </div>

                              <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                                <div className="flex items-center gap-3 text-sm text-slate-700">
                                  <UserRound
                                    size={18}
                                    className="text-sky-600"
                                  />
                                  {turno.cliente_nombre}{" "}
                                  {turno.cliente_apellido}
                                </div>

                                <div className="flex items-center gap-3 text-sm text-slate-700">
                                  <CarFront
                                    size={18}
                                    className="text-sky-600"
                                  />
                                  {turno.marca} {turno.modelo} — {turno.patente}
                                </div>

                                <div className="flex items-center gap-3 text-sm text-slate-700">
                                  <Droplets
                                    size={18}
                                    className="text-sky-600"
                                  />

                                  {turno.servicio}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* SIN ACTIVIDAD */}
                        {turnos.length === 0 && bloqueos.length === 0 && (
                          <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-200 px-5 py-12 text-center">
                            <CalendarDays
                              size={36}
                              className="text-slate-300"
                            />

                            <p className="mt-4 font-semibold text-slate-700">
                              Sin actividad registrada
                            </p>

                            <p className="mt-2 text-sm text-slate-500">
                              No hay turnos ni bloqueos para esta fecha.
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 border-t border-slate-100 pt-5 text-xs text-slate-500">
                          <ShieldCheck size={17} className="text-sky-600" />
                          Agenda del puesto
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function TarjetaResumen({ icono: Icono, titulo, cantidad }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
        <Icono size={24} />
      </div>

      <div>
        <p className="text-2xl font-extrabold text-slate-950">{cantidad}</p>

        <p className="text-sm text-slate-500">{titulo}</p>
      </div>
    </div>
  );
}

export default AgendaAdmin;
