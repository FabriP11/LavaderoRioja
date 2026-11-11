import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";

import {
  LayoutDashboard,
  CalendarDays,
  CarFront,
  Clock3,
  MapPin,
  Search,
  RefreshCw,
  LoaderCircle,
  AlertCircle,
  ClipboardList,
  CheckCircle2,
  Droplets,
  ArrowRight,
  Settings2,
  CreditCard,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

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
    clase: "bg-teal-100 text-teal-700",
  },
  cancelado: {
    texto: "Cancelado",
    clase: "bg-red-100 text-red-700",
  },
};

function formatearFecha(fecha) {
  if (!fecha) return "-";

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

const accionesPorEstado = {
  reservado: {
    estado: "en_proceso",
    texto: "Iniciar lavado",
  },
  en_proceso: {
    estado: "finalizado",
    texto: "Finalizar lavado",
  },
  finalizado: {
    estado: "entregado",
    texto: "Marcar entregado",
  },
};

function PanelAdmin() {
  const { usuario, comprobandoSesion } = useAuth();

  const [turnos, setTurnos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [actualizacion, setActualizacion] = useState(0);

  const [cambiandoId, setCambiandoId] = useState(null);
  const [mensajeEstado, setMensajeEstado] = useState("");
  const [errorEstado, setErrorEstado] = useState("");

  // Obtener todas las reservas
  useEffect(() => {
    if (comprobandoSesion || !usuario || usuario.rol !== "administrador") {
      return;
    }

    const controller = new AbortController();

    async function obtenerTurnos() {
      setCargando(true);
      setError("");

      try {
        const respuesta = await fetch(`${API_URL}/api/admin/turnos`, {
          credentials: "include",
          signal: controller.signal,
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.mensaje || "No se pudieron cargar las reservas.",
          );
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
  }, [usuario, comprobandoSesion, actualizacion]);

  const cambiarEstado = async (turno) => {
    const accion = accionesPorEstado[turno.estado];

    if (!accion) return;

    const confirmar = window.confirm(
      `¿Querés cambiar la reserva #${turno.id_turno} a "${accion.estado.replaceAll("_", " ")}"?`,
    );

    if (!confirmar) return;

    setCambiandoId(turno.id_turno);
    setMensajeEstado("");
    setErrorEstado("");

    try {
      const respuesta = await fetch(
        `${API_URL}/api/admin/turnos/${turno.id_turno}/estado`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            estado: accion.estado,
          }),
        },
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(resultado.mensaje || "No se pudo actualizar el turno.");
      }

      // Actualizar la tabla sin recargar la página
      setTurnos((anteriores) =>
        anteriores.map((item) =>
          item.id_turno === turno.id_turno
            ? { ...item, estado: resultado.turno.estado }
            : item,
        ),
      );

      setMensajeEstado(
        `¡Reserva #${turno.id_turno} actualizada correctamente!`,
      );
    } catch (error) {
      setErrorEstado(
        error instanceof TypeError
          ? "No se pudo conectar con el servidor."
          : error.message,
      );
    } finally {
      setCambiandoId(null);
    }
  };

  // Esperar la comprobación de la sesión
  if (comprobandoSesion) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-500">
        <LoaderCircle className="animate-spin text-sky-500" />
        Comprobando permisos...
      </div>
    );
  }

  // Proteger la pantalla
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (usuario.rol !== "administrador") {
    return <Navigate to="/" replace />;
  }

  // Estadísticas generales
  const totalReservas = turnos.length;

  const reservados = turnos.filter(
    (turno) => turno.estado === "reservado",
  ).length;

  const enProceso = turnos.filter(
    (turno) => turno.estado === "en_proceso",
  ).length;

  const completados = turnos.filter(
    (turno) => turno.estado === "finalizado" || turno.estado === "entregado",
  ).length;

  // Filtrar reservas
  const turnosFiltrados = turnos.filter((turno) => {
    const coincideEstado =
      filtroEstado === "todos" || turno.estado === filtroEstado;

    const texto = [
      turno.id_turno,
      turno.cliente_nombre,
      turno.cliente_apellido,
      turno.patente,
      turno.marca,
      turno.modelo,
      turno.servicio,
      turno.puesto,
    ]
      .map((valor) => String(valor ?? ""))
      .join(" ")
      .toLowerCase();

    const coincideBusqueda = texto.includes(busqueda.trim().toLowerCase());

    return coincideEstado && coincideBusqueda;
  });

  const resumen = [
    {
      titulo: "Total de reservas",
      valor: totalReservas,
      icono: CalendarDays,
      clase: "bg-slate-100 text-slate-700",
    },
    {
      titulo: "Reservados",
      valor: reservados,
      icono: ClipboardList,
      clase: "bg-sky-100 text-sky-700",
    },
    {
      titulo: "En proceso",
      valor: enProceso,
      icono: Droplets,
      clase: "bg-amber-100 text-amber-700",
    },
    {
      titulo: "Completados",
      valor: completados,
      icono: CheckCircle2,
      clase: "bg-emerald-100 text-emerald-700",
    },
  ];

  return (
    <section className="min-h-screen bg-slate-50 px-6 py-12 lg:py-16">
      <div className="mx-auto max-w-7xl">
        {/* ENCABEZADO */}
        <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
              Administración · Lavadero Rioja
            </span>

            <h1 className="mt-3 flex items-center gap-3 text-3xl font-extrabold text-slate-950 sm:text-4xl">
              <LayoutDashboard size={32} className="text-sky-600" />
              Panel de administración
            </h1>

            <p className="mt-3 text-slate-500">
              Consultá y supervisá todas las reservas del lavadero.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActualizacion((anterior) => anterior + 1)}
            disabled={cargando}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw size={18} className={cargando ? "animate-spin" : ""} />
            Actualizar reservas
          </button>
        </div>

        {/* MENSAJE DE ÉXITO */}
        {mensajeEstado && (
          <div
            role="status"
            className="mb-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-700"
          >
            {mensajeEstado}
          </div>
        )}

        {/* MENSAJE DE ERROR */}
        {errorEstado && (
          <div
            role="alert"
            className="mb-7 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
          >
            <AlertCircle size={19} />
            {errorEstado}
          </div>
        )}

        {/* ACCESO A LA AGENDA */}
        <Link
          to="/admin/agenda"
          className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-sky-200 bg-sky-50 p-6 transition hover:bg-sky-100"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <CalendarDays size={25} />
            </div>

            <div>
              <h2 className="font-bold text-slate-950">Agenda de puestos</h2>

              <p className="mt-1 text-sm text-slate-600">
                Consultar las reservas del Puesto 1 y Puesto 2.
              </p>
            </div>
          </div>

          <span className="text-sm font-bold text-sky-700">Ver agenda</span>
        </Link>

        {/* ACCESO A ADMINISTRAR SERVICIOS */}
        <Link
          to="/admin/servicios"
          className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-sky-200 bg-sky-50 p-6 transition hover:bg-sky-100"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <Settings2 size={25} />
            </div>

            <div>
              <h2 className="font-bold text-slate-950">
                Administrar servicios
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Modificar precios, duraciones y disponibilidad.
              </p>
            </div>
          </div>

          <span className="text-sm font-bold text-sky-700">Ver servicios</span>
        </Link>

        {/* ACCESO A GESTIÓN DE PAGOS */}
        <Link
          to="/admin/pagos"
          className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-sky-200 bg-sky-50 p-6 transition hover:bg-sky-100"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <CreditCard size={25} />
            </div>

            <div>
              <h2 className="font-bold text-slate-950">Gestión de pagos</h2>

              <p className="mt-1 text-sm text-slate-600">
                Registrar cobros y consultar los pagos realizados.
              </p>
            </div>
          </div>

          <span className="text-sm font-bold text-sky-700">Ver pagos</span>
        </Link>

        {/* ESTADÍSTICAS */}
        <div className="mb-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {resumen.map((dato) => {
            const Icono = dato.icono;

            return (
              <div
                key={dato.titulo}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${dato.clase}`}
                >
                  <Icono size={24} />
                </div>

                <p className="text-3xl font-extrabold text-slate-950">
                  {dato.valor}
                </p>

                <p className="mt-2 text-sm font-medium text-slate-500">
                  {dato.titulo}
                </p>
              </div>
            );
          })}
        </div>

        {/* LISTADO DE RESERVAS */}
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {/* TÍTULO Y FILTROS */}
          <div className="border-b border-slate-100 p-6 sm:p-8">
            <h2 className="text-xl font-extrabold text-slate-950">
              Todas las reservas
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Consultá las reservas de todos los clientes.
            </p>

            <div className="mt-7 grid gap-4 md:grid-cols-[1fr_220px]">
              {/* BUSCADOR */}
              <div className="relative">
                <Search
                  size={19}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  type="search"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar cliente, patente, servicio..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                />
              </div>

              {/* FILTRO POR ESTADO */}
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-800 outline-none focus:border-sky-400"
              >
                <option value="todos">Todos los estados</option>
                <option value="reservado">Reservados</option>
                <option value="en_proceso">En proceso</option>
                <option value="finalizado">Finalizados</option>
                <option value="entregado">Entregados</option>
                <option value="cancelado">Cancelados</option>
              </select>
            </div>
          </div>

          {/* CARGANDO */}
          {cargando && (
            <div className="flex items-center justify-center gap-3 p-14 text-slate-500">
              <LoaderCircle className="animate-spin text-sky-500" />
              Cargando reservas...
            </div>
          )}

          {/* ERROR */}
          {!cargando && error && (
            <div
              role="alert"
              className="m-6 flex items-start gap-3 rounded-xl bg-red-50 p-5 text-red-700"
            >
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {/* TABLA */}
          {!cargando && !error && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Reserva</th>
                      <th className="px-5 py-4">Cliente</th>
                      <th className="px-5 py-4">Vehículo</th>
                      <th className="px-5 py-4">Servicio</th>
                      <th className="px-5 py-4">Fecha y hora</th>
                      <th className="px-5 py-4">Puesto</th>
                      <th className="px-5 py-4">Estado</th>
                      <th className="px-5 py-4">Precio</th>
                      <th className="px-5 py-4">Acciones</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {turnosFiltrados.map((turno) => {
                      const estado = estados[turno.estado] || {
                        texto: turno.estado,
                        clase: "bg-slate-100 text-slate-600",
                      };
                      const accion = accionesPorEstado[turno.estado];

                      return (
                        <tr
                          key={turno.id_turno}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="px-5 py-5 font-bold text-slate-900">
                            #{turno.id_turno}
                          </td>

                          <td className="px-5 py-5">
                            {accion ? (
                              <button
                                type="button"
                                onClick={() => cambiarEstado(turno)}
                                disabled={cambiandoId !== null}
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-sky-500 px-4 py-3 text-xs font-bold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {cambiandoId === turno.id_turno ? (
                                  <>
                                    <LoaderCircle
                                      size={16}
                                      className="animate-spin"
                                    />
                                    Actualizando...
                                  </>
                                ) : (
                                  <>
                                    {accion.texto}
                                    <ArrowRight size={16} />
                                  </>
                                )}
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">
                                Sin acciones
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-5">
                            <p className="font-semibold text-slate-900">
                              {turno.cliente_nombre} {turno.cliente_apellido}
                            </p>
                          </td>

                          <td className="px-5 py-5">
                            <div className="flex items-start gap-2">
                              <CarFront
                                size={18}
                                className="mt-0.5 shrink-0 text-sky-600"
                              />

                              <div>
                                <p className="font-semibold text-slate-900">
                                  {turno.marca} {turno.modelo}
                                </p>

                                <p className="mt-1 text-xs uppercase text-slate-500">
                                  {turno.patente}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-5 text-slate-700">
                            {turno.servicio}
                          </td>

                          <td className="px-5 py-5">
                            <div className="flex items-center gap-2 text-slate-900">
                              <CalendarDays size={16} />
                              {formatearFecha(turno.fecha)}
                            </div>

                            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                              <Clock3 size={15} />
                              {turno.hora_inicio} a {turno.hora_fin}
                            </div>
                          </td>

                          <td className="px-5 py-5">
                            <div className="flex items-center gap-2 text-slate-700">
                              <MapPin size={16} />
                              {turno.puesto}
                            </div>
                          </td>

                          <td className="px-5 py-5">
                            <span
                              className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${estado.clase}`}
                            >
                              {estado.texto}
                            </span>
                          </td>

                          <td className="px-5 py-5 font-bold text-slate-900">
                            {formatearPrecio(turno.precio_aplicado)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {turnosFiltrados.length === 0 && (
                <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
                  <ClipboardList size={42} className="text-slate-300" />

                  <p className="font-semibold text-slate-700">
                    No se encontraron reservas.
                  </p>

                  <p className="text-sm text-slate-500">
                    Probá cambiando los filtros o la búsqueda.
                  </p>
                </div>
              )}

              {/* PIE DE TABLA */}
              <div className="border-t border-slate-100 px-6 py-5 text-sm text-slate-500">
                Mostrando {turnosFiltrados.length} de {turnos.length} reservas
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default PanelAdmin;
