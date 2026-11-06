import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";

import {
  ArrowLeft,
  Droplets,
  Clock3,
  Pencil,
  Save,
  X,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Settings2,
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

function ServiciosAdmin() {
  const { usuario, comprobandoSesion } = useAuth();

  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [editandoId, setEditandoId] = useState(null);

  const [formulario, setFormulario] = useState({
    precio: "",
    duracion_minutos: "30",
    activo: 1,
  });

  const [guardando, setGuardando] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const [actualizacion, setActualizacion] = useState(0);

  // Obtener los servicios del backend
  useEffect(() => {
    if (comprobandoSesion || !usuario || usuario.rol !== "administrador") {
      return;
    }

    const controller = new AbortController();

    async function obtenerServicios() {
      setCargando(true);
      setError("");

      try {
        const respuesta = await fetch(`${API_URL}/api/admin/servicios`, {
          credentials: "include",
          signal: controller.signal,
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.mensaje || "No se pudieron cargar los servicios.",
          );
        }

        if (!controller.signal.aborted) {
          setServicios(Array.isArray(datos.servicios) ? datos.servicios : []);
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

    obtenerServicios();

    return () => controller.abort();
  }, [usuario, comprobandoSesion, actualizacion]);

  // Abrir el formulario de edición
  const iniciarEdicion = (servicio) => {
    setEditandoId(servicio.id_servicio);

    setFormulario({
      precio: String(servicio.precio),
      duracion_minutos: String(servicio.duracion_minutos),
      activo: Number(servicio.activo),
    });

    setErrorEdicion("");
    setMensajeExito("");
  };

  // Cerrar el formulario
  const cancelarEdicion = () => {
    setEditandoId(null);
    setErrorEdicion("");
  };

  // Guardar los cambios en MySQL
  const guardarServicio = async (e, idServicio) => {
    e.preventDefault();

    setErrorEdicion("");
    setMensajeExito("");

    const precio = Number(formulario.precio);
    const duracion = Number(formulario.duracion_minutos);

    if (!Number.isFinite(precio) || precio <= 0) {
      setErrorEdicion("Ingresá un precio válido.");
      return;
    }

    if (
      !Number.isInteger(duracion) ||
      duracion < 30 ||
      duracion > 240 ||
      duracion % 30 !== 0
    ) {
      setErrorEdicion(
        "La duración debe estar entre 30 y 240 minutos, en intervalos de 30.",
      );
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await fetch(
        `${API_URL}/api/admin/servicios/${idServicio}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            precio: formulario.precio,
            duracion_minutos: duracion,
            activo: Number(formulario.activo),
          }),
        },
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje || "No se pudo actualizar el servicio.",
        );
      }

      // Actualizar la tarjeta sin recargar
      setServicios((anteriores) =>
        anteriores.map((servicio) =>
          servicio.id_servicio === resultado.servicio.id_servicio
            ? resultado.servicio
            : servicio,
        ),
      );

      setEditandoId(null);

      setMensajeExito(
        `¡${resultado.servicio.nombre} actualizado correctamente!`,
      );
    } catch (error) {
      setErrorEdicion(
        error instanceof TypeError
          ? "No se pudo conectar con el servidor."
          : error.message,
      );
    } finally {
      setGuardando(false);
    }
  };

  // Proteger la pantalla
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

  const serviciosActivos = servicios.filter(
    (servicio) => Number(servicio.activo) === 1,
  ).length;

  return (
    <section className="min-h-screen bg-slate-50 px-6 py-12 lg:py-16">
      <div className="mx-auto max-w-6xl">
        {/* VOLVER */}
        <Link
          to="/admin"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-sky-600"
        >
          <ArrowLeft size={18} />
          Volver al panel
        </Link>

        {/* ENCABEZADO */}
        <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
              Administración · Lavadero Rioja
            </span>

            <h1 className="mt-3 flex items-center gap-3 text-3xl font-extrabold text-slate-950 sm:text-4xl">
              <Settings2 className="text-sky-600" size={32} />
              Administrar servicios
            </h1>

            <p className="mt-3 text-slate-500">
              Gestioná los precios, las duraciones y la disponibilidad de los
              servicios.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActualizacion((anterior) => anterior + 1)}
            disabled={cargando || guardando}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw size={18} />
            Actualizar
          </button>
        </div>

        {/* RESUMEN */}
        <div className="mb-9 grid gap-5 sm:grid-cols-3">
          <TarjetaResumen
            titulo="Total de servicios"
            valor={servicios.length}
          />

          <TarjetaResumen titulo="Servicios activos" valor={serviciosActivos} />

          <TarjetaResumen
            titulo="Servicios inactivos"
            valor={servicios.length - serviciosActivos}
          />
        </div>

        {/* MENSAJE DE ÉXITO */}
        {mensajeExito && (
          <div
            role="status"
            className="mb-8 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700"
          >
            <CheckCircle2 size={21} />
            {mensajeExito}
          </div>
        )}

        {/* CARGANDO */}
        {cargando && (
          <div className="flex items-center justify-center gap-3 rounded-3xl bg-white p-12 text-slate-500">
            <LoaderCircle className="animate-spin text-sky-500" />
            Cargando servicios...
          </div>
        )}

        {/* ERROR */}
        {!cargando && error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"
          >
            <AlertCircle size={21} />
            {error}
          </div>
        )}

        {/* LISTADO DE SERVICIOS */}
        {!cargando && !error && (
          <div className="grid gap-6 lg:grid-cols-3">
            {servicios.map((servicio) => {
              const activo = Number(servicio.activo) === 1;

              const editando = editandoId === servicio.id_servicio;

              return (
                <article
                  key={servicio.id_servicio}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* CABECERA */}
                  <div className="bg-[#081727] p-7 text-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-400">
                        <Droplets size={29} />
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          activo
                            ? "bg-emerald-400/15 text-emerald-300"
                            : "bg-red-400/15 text-red-300"
                        }`}
                      >
                        {activo ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    <h2 className="mt-6 text-xl font-extrabold">
                      {servicio.nombre}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      {servicio.descripcion ||
                        "Servicio de lavado de vehículos."}
                    </p>
                  </div>

                  {/* CONTENIDO */}
                  <div className="p-7">
                    {!editando ? (
                      <>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Precio actual
                          </p>

                          <p className="mt-2 text-3xl font-extrabold text-slate-950">
                            {formatearPrecio(servicio.precio)}
                          </p>
                        </div>

                        <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-6">
                          <Clock3 size={20} className="text-sky-600" />

                          <div>
                            <p className="text-xs text-slate-500">Duración</p>

                            <p className="font-bold text-slate-900">
                              {servicio.duracion_minutos} minutos
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => iniciarEdicion(servicio)}
                          className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-sky-600"
                        >
                          <Pencil size={18} />
                          Editar servicio
                        </button>
                      </>
                    ) : (
                      <form
                        onSubmit={(e) =>
                          guardarServicio(e, servicio.id_servicio)
                        }
                        className="space-y-5"
                      >
                        {/* PRECIO */}
                        <div>
                          <label
                            htmlFor={`precio-${servicio.id_servicio}`}
                            className="mb-2 block text-sm font-semibold text-slate-700"
                          >
                            Precio ($ ARS)
                          </label>

                          <input
                            id={`precio-${servicio.id_servicio}`}
                            type="number"
                            min="0.01"
                            max="99999999.99"
                            step="0.01"
                            value={formulario.precio}
                            onChange={(e) =>
                              setFormulario((anterior) => ({
                                ...anterior,
                                precio: e.target.value,
                              }))
                            }
                            required
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-sky-400"
                          />
                        </div>

                        {/* DURACIÓN */}
                        <div>
                          <label
                            htmlFor={`duracion-${servicio.id_servicio}`}
                            className="mb-2 block text-sm font-semibold text-slate-700"
                          >
                            Duración
                          </label>

                          <select
                            id={`duracion-${servicio.id_servicio}`}
                            value={formulario.duracion_minutos}
                            onChange={(e) =>
                              setFormulario((anterior) => ({
                                ...anterior,
                                duracion_minutos: e.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-sky-400"
                          >
                            {[30, 60, 90, 120, 150, 180, 210, 240].map(
                              (minutos) => (
                                <option key={minutos} value={minutos}>
                                  {minutos} minutos
                                </option>
                              ),
                            )}
                          </select>
                        </div>

                        {/* ESTADO */}
                        <div>
                          <label
                            htmlFor={`activo-${servicio.id_servicio}`}
                            className="mb-2 block text-sm font-semibold text-slate-700"
                          >
                            Disponibilidad
                          </label>

                          <select
                            id={`activo-${servicio.id_servicio}`}
                            value={formulario.activo}
                            onChange={(e) =>
                              setFormulario((anterior) => ({
                                ...anterior,
                                activo: Number(e.target.value),
                              }))
                            }
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none focus:border-sky-400"
                          >
                            <option value={1}>Activo</option>
                            <option value={0}>Inactivo</option>
                          </select>
                        </div>

                        {/* ERROR */}
                        {errorEdicion && (
                          <div
                            role="alert"
                            className="flex items-start gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-700"
                          >
                            <AlertCircle size={18} className="shrink-0" />
                            {errorEdicion}
                          </div>
                        )}

                        {/* BOTONES */}
                        <div className="flex gap-3 border-t border-slate-100 pt-5">
                          <button
                            type="button"
                            disabled={guardando}
                            onClick={cancelarEdicion}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          >
                            <X size={17} />
                            Cancelar
                          </button>

                          <button
                            type="submit"
                            disabled={guardando}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 px-3 py-3 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-50"
                          >
                            {guardando ? (
                              <LoaderCircle
                                size={17}
                                className="animate-spin"
                              />
                            ) : (
                              <Save size={17} />
                            )}

                            {guardando ? "Guardando..." : "Guardar"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function TarjetaResumen({ titulo, valor }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-3xl font-extrabold text-slate-950">{valor}</p>

      <p className="mt-2 text-sm font-medium text-slate-500">{titulo}</p>
    </div>
  );
}

export default ServiciosAdmin;
