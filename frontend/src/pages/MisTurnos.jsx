import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import {
  CalendarDays,
  Clock3,
  CarFront,
  Droplets,
  MapPin,
  CircleAlert,
  LoaderCircle,
  Plus,
  Receipt,
  CalendarX2,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

const estados = {
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
    clase: "bg-emerald-100 text-emerald-700",
  },
  cancelado: {
    texto: "Cancelado",
    clase: "bg-red-100 text-red-700",
  },
};

function formatearFecha(fecha) {
  const [anio, mes, dia] = fecha.split("-");
  return `${dia}/${mes}/${anio}`;
}

function formatearPrecio(precio) {
  return Number(precio).toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  });
}

function MisTurnos() {
  const { usuario, comprobandoSesion } = useAuth();

  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [cancelandoId, setCancelandoId] = useState(null);
  const [errorCancelacion, setErrorCancelacion] = useState("");
  const [mensajeCancelacion, setMensajeCancelacion] = useState("");

  useEffect(() => {
    if (comprobandoSesion || !usuario) return;

    const controller = new AbortController();

    async function obtenerTurnos() {
      setCargando(true);
      setError("");

      try {
        const respuesta = await fetch(`${API_URL}/api/mis-turnos`, {
          credentials: "include",
          signal: controller.signal,
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(datos.mensaje || "No se pudieron cargar tus turnos.");
        }

        if (!controller.signal.aborted) {
          setTurnos(Array.isArray(datos.turnos) ? datos.turnos : []);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
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

    obtenerTurnos();

    return () => controller.abort();
  }, [usuario, comprobandoSesion]);

  const cancelarTurno = async (turno) => {
    const confirmar = window.confirm(
      `¿Estás seguro de cancelar la reserva #${turno.id_turno}?`,
    );

    if (!confirmar) return;

    setCancelandoId(turno.id_turno);
    setErrorCancelacion("");
    setMensajeCancelacion("");

    try {
      const respuesta = await fetch(
        `${API_URL}/api/mis-turnos/${turno.id_turno}/cancelar`,
        {
          method: "PATCH",
          credentials: "include",
        },
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(resultado.mensaje || "No se pudo cancelar el turno.");
      }

      // Actualizar el turno sin recargar la página
      setTurnos((anteriores) =>
        anteriores.map((item) =>
          item.id_turno === turno.id_turno
            ? { ...item, estado: "cancelado" }
            : item,
        ),
      );

      setMensajeCancelacion(
        `¡La reserva #${turno.id_turno} fue cancelada correctamente!`,
      );
    } catch (error) {
      setErrorCancelacion(
        error instanceof TypeError
          ? "No se pudo conectar con el servidor."
          : error.message,
      );
    } finally {
      setCancelandoId(null);
    }
  };

  if (comprobandoSesion) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-500">
        <LoaderCircle className="animate-spin text-sky-500" />
        Comprobando sesión...
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return (
    <section className="min-h-screen bg-slate-50 px-6 py-12 lg:py-16">
      <div className="mx-auto max-w-6xl">
        {/* ENCABEZADO */}
        <div className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
              Mi cuenta
            </span>

            <h1 className="mt-3 text-4xl font-extrabold text-slate-950">
              Mis turnos
            </h1>

            <p className="mt-3 text-slate-500">
              Consultá tus reservas y el historial de servicios de Lavadero
              Rioja.
            </p>
          </div>

          <Link
            to="/reservar-turno"
            className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-4 text-sm font-bold text-white transition hover:bg-sky-600"
          >
            <Plus size={19} />
            Nueva reserva
          </Link>
        </div>

        {/* MENSAJE DE CANCELACIÓN */}
        {mensajeCancelacion && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700"
          >
            {mensajeCancelacion}
          </div>
        )}

        {/* ERROR DE CANCELACIÓN */}
        {errorCancelacion && (
          <div
            role="alert"
            className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
          >
            <CircleAlert size={19} />
            {errorCancelacion}
          </div>
        )}

        {/* CARGANDO */}
        {cargando && (
          <div className="flex items-center justify-center gap-3 rounded-3xl bg-white p-12 text-slate-500">
            <LoaderCircle className="animate-spin text-sky-500" />
            Cargando tus turnos...
          </div>
        )}

        {/* ERROR */}
        {!cargando && error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"
          >
            <CircleAlert className="shrink-0" />
            {error}
          </div>
        )}

        {/* SIN TURNOS */}
        {!cargando && !error && turnos.length === 0 && (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-sky-50 text-sky-600">
              <CalendarDays size={40} />
            </div>

            <h2 className="text-2xl font-bold text-slate-950">
              Todavía no tenés reservas
            </h2>

            <p className="mt-3 max-w-md text-slate-500">
              Elegí un servicio, seleccioná tu vehículo y reservá tu primer
              turno online.
            </p>

            <Link
              to="/reservar-turno"
              className="mt-7 rounded-xl bg-sky-500 px-6 py-4 text-sm font-bold text-white hover:bg-sky-600"
            >
              Reservar mi primer turno
            </Link>
          </div>
        )}

        {/* LISTADO */}
        {!cargando && !error && turnos.length > 0 && (
          <div className="space-y-5">
            <p className="text-sm font-semibold text-slate-600">
              {turnos.length} reservas registradas
            </p>

            {turnos.map((turno) => {
              const estado = estados[turno.estado] || {
                texto: turno.estado,
                clase: "bg-slate-100 text-slate-600",
              };

              return (
                <article
                  key={turno.id_turno}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* CABECERA */}
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-7 py-5">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Reserva #{turno.id_turno}
                      </p>

                      <h2 className="mt-2 text-xl font-extrabold text-slate-950">
                        {turno.servicio}
                      </h2>
                    </div>

                    <span
                      className={`rounded-full px-4 py-2 text-xs font-bold ${estado.clase}`}
                    >
                      {estado.texto}
                    </span>
                  </div>

                  {/* DETALLES */}
                  <div className="grid gap-6 p-7 sm:grid-cols-2 lg:grid-cols-3">
                    <DatoTurno
                      icono={CalendarDays}
                      etiqueta="Fecha"
                      valor={formatearFecha(turno.fecha)}
                    />

                    <DatoTurno
                      icono={Clock3}
                      etiqueta="Horario"
                      valor={`${turno.hora_inicio} a ${turno.hora_fin}`}
                    />

                    <DatoTurno
                      icono={CarFront}
                      etiqueta="Vehículo"
                      valor={`${turno.marca} ${turno.modelo}`}
                      detalle={turno.patente}
                    />

                    <DatoTurno
                      icono={MapPin}
                      etiqueta="Puesto asignado"
                      valor={turno.puesto}
                    />

                    <DatoTurno
                      icono={Droplets}
                      etiqueta="Servicio"
                      valor={turno.servicio}
                    />

                    <DatoTurno
                      icono={Receipt}
                      etiqueta="Precio"
                      valor={formatearPrecio(turno.precio_aplicado)}
                    />
                  </div>

                  {/* ACCIONES DEL TURNO */}
                  {turno.estado === "reservado" && (
                    <div className="flex justify-end border-t border-slate-100 px-7 py-5">
                      <button
                        type="button"
                        onClick={() => cancelarTurno(turno)}
                        disabled={cancelandoId !== null}
                        className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CalendarX2 size={18} />

                        {cancelandoId === turno.id_turno
                          ? "Cancelando..."
                          : "Cancelar turno"}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function DatoTurno({ icono: Icono, etiqueta, valor, detalle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
        <Icono size={20} />
      </div>

      <div>
        <p className="text-xs font-medium text-slate-500">{etiqueta}</p>

        <p className="mt-1 font-bold text-slate-900">{valor}</p>

        {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
      </div>
    </div>
  );
}

export default MisTurnos;
