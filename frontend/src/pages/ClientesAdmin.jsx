import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router";
import {
  ArrowLeft,
  Users,
  Search,
  CarFront,
  CalendarDays,
  UserRound,
  LoaderCircle,
  AlertCircle,
  X,
  Mail,
  Phone,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

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

async function solicitar(ruta, signal) {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    credentials: "include",
    signal,
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(datos.mensaje || "No se pudo completar la consulta.");
  }

  return datos;
}

export default function ClientesAdmin() {
  const { usuario, comprobandoSesion } = useAuth();

  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [idSeleccionado, setIdSeleccionado] = useState(null);
  const [detalle, setDetalle] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState("");

  // Cargar clientes
  useEffect(() => {
    if (comprobandoSesion || usuario?.rol !== "administrador") {
      return;
    }

    const controller = new AbortController();

    async function cargarClientes() {
      setCargando(true);
      setError("");

      try {
        const datos = await solicitar("/api/admin/clientes", controller.signal);

        if (!controller.signal.aborted) {
          setClientes(datos.clientes || []);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }

    cargarClientes();

    return () => controller.abort();
  }, [usuario?.rol, comprobandoSesion]);

  // Cargar detalle del cliente seleccionado
  useEffect(() => {
    if (!idSeleccionado || usuario?.rol !== "administrador") {
      return;
    }

    const controller = new AbortController();

    async function cargarDetalle() {
      setCargandoDetalle(true);
      setDetalle(null);
      setErrorDetalle("");

      try {
        const datos = await solicitar(
          `/api/admin/clientes/${idSeleccionado}`,
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setDetalle(datos);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setErrorDetalle(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoDetalle(false);
        }
      }
    }

    cargarDetalle();

    return () => controller.abort();
  }, [idSeleccionado, usuario?.rol]);

  // Buscar clientes
  const clientesFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return clientes.filter((cliente) => {
      const contenido = [
        cliente.nombre,
        cliente.apellido,
        cliente.nombre_usuario,
        cliente.correo_contacto,
        cliente.telefono,
      ]
        .map((valor) => String(valor ?? ""))
        .join(" ")
        .toLowerCase();

      return contenido.includes(texto);
    });
  }, [clientes, busqueda]);

  function verCliente(id) {
    if (idSeleccionado === id) {
      setIdSeleccionado(null);
      setDetalle(null);
    } else {
      setIdSeleccionado(id);
    }
  }

  // Verificar permisos
  if (comprobandoSesion) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-500">
        <LoaderCircle className="animate-spin text-sky-600" />
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

  return (
    <section className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-7xl">
        {/* VOLVER */}
        <Link
          to="/admin"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-900"
        >
          <ArrowLeft size={18} />
          Volver al panel
        </Link>

        {/* ENCABEZADO */}
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-extrabold text-slate-950">
              <Users size={32} className="text-sky-600" />
              Gestión de clientes
            </h1>

            <p className="mt-3 text-slate-500">
              Consultá los clientes registrados, sus vehículos y su historial de
              reservas.
            </p>
          </div>

          <Link
            to="/admin/clientes/nuevo"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-sky-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-sky-700"
          >
            Registrar cliente presencial
          </Link>
        </div>

        {/* RESUMEN */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-sky-100 p-3 text-sky-700">
              <Users size={26} />
            </div>

            <div>
              <p className="text-sm text-slate-500">Clientes registrados</p>

              <p className="text-3xl font-extrabold text-slate-900">
                {clientes.length}
              </p>
            </div>
          </div>
        </div>

        {/* ERROR GENERAL */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {/* BUSCADOR Y TABLA */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-6">
            <h2 className="text-xl font-bold text-slate-900">
              Listado de clientes
            </h2>

            <div className="relative mt-5">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre, apellido, usuario o correo..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {cargando ? (
            <div className="flex items-center justify-center gap-3 p-12 text-slate-500">
              <LoaderCircle className="animate-spin" />
              Cargando clientes...
            </div>
          ) : !error && clientesFiltrados.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              No se encontraron clientes.
            </div>
          ) : (
            !error && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Cliente</th>
                      <th className="px-5 py-4">Contacto</th>
                      <th className="px-5 py-4">Vehículos</th>
                      <th className="px-5 py-4">Reservas</th>
                      <th className="px-5 py-4">Acciones</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {clientesFiltrados.map((cliente) => (
                      <tr
                        key={cliente.id_cliente}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">
                            {cliente.nombre} {cliente.apellido}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {cliente.nombre_usuario
                              ? `@${cliente.nombre_usuario}`
                              : "Cliente presencial"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-slate-600">
                          <p>{cliente.correo_contacto || "-"}</p>
                          <p className="mt-1 text-xs">
                            {cliente.telefono || "Sin teléfono"}
                          </p>
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {cliente.total_vehiculos}
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {cliente.total_turnos}
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => verCliente(cliente.id_cliente)}
                            className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white transition hover:bg-sky-700"
                          >
                            {idSeleccionado === cliente.id_cliente
                              ? "Cerrar detalle"
                              : "Ver detalle"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>

        {/* DETALLE DEL CLIENTE */}
        {idSeleccionado !== null && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                <UserRound size={23} className="text-sky-600" />
                Detalle del cliente
              </h2>

              <button
                type="button"
                onClick={() => {
                  setIdSeleccionado(null);
                  setDetalle(null);
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar detalle"
              >
                <X size={20} />
              </button>
            </div>

            {cargandoDetalle ? (
              <p className="flex items-center gap-3 text-slate-500">
                <LoaderCircle className="animate-spin" />
                Cargando información...
              </p>
            ) : errorDetalle ? (
              <p className="text-red-600">{errorDetalle}</p>
            ) : detalle ? (
              <div className="space-y-8">
                {/* DATOS PERSONALES */}
                <div>
                  <h3 className="mb-4 font-bold text-slate-900">
                    Información personal
                  </h3>

                  <div className="grid gap-4 rounded-xl bg-slate-50 p-5 sm:grid-cols-2">
                    <p>
                      <strong>Nombre:</strong> {detalle.cliente.nombre}{" "}
                      {detalle.cliente.apellido}
                    </p>

                    <p>
                      <strong>Usuario:</strong>{" "}
                      {detalle.cliente.nombre_usuario || "Sin cuenta web"}
                    </p>

                    <p className="flex items-center gap-2">
                      <Mail size={17} className="text-sky-600" />
                      {detalle.cliente.correo || "-"}
                    </p>

                    <p className="flex items-center gap-2">
                      <Phone size={17} className="text-sky-600" />
                      {detalle.cliente.telefono || "Sin teléfono"}
                    </p>
                  </div>
                </div>

                {/* VEHÍCULOS */}
                <div>
                  <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
                    <CarFront size={20} className="text-sky-600" />
                    Vehículos registrados
                  </h3>

                  {detalle.vehiculos.length === 0 ? (
                    <p className="text-slate-500">
                      Este cliente no tiene vehículos registrados.
                    </p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {detalle.vehiculos.map((vehiculo) => (
                        <div
                          key={vehiculo.id_vehiculo}
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <p className="font-bold text-slate-900">
                            {vehiculo.marca} {vehiculo.modelo}
                          </p>

                          <p className="mt-1 text-sm uppercase text-slate-500">
                            {vehiculo.patente}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* HISTORIAL */}
                <div>
                  <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-900">
                    <CalendarDays size={20} className="text-sky-600" />
                    Historial de reservas
                  </h3>

                  {detalle.turnos.length === 0 ? (
                    <p className="text-slate-500">
                      Este cliente todavía no tiene reservas.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px] text-left text-sm">
                        <thead className="bg-slate-100 text-slate-600">
                          <tr>
                            <th className="px-4 py-3">Turno</th>
                            <th className="px-4 py-3">Fecha</th>
                            <th className="px-4 py-3">Servicio</th>
                            <th className="px-4 py-3">Vehículo</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3">Importe</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {detalle.turnos.map((turno) => (
                            <tr key={turno.id_turno}>
                              <td className="px-4 py-3">#{turno.id_turno}</td>

                              <td className="px-4 py-3">
                                {formatearFecha(turno.fecha)}
                                <span className="ml-2 text-slate-500">
                                  {turno.hora_inicio}
                                </span>
                              </td>

                              <td className="px-4 py-3">{turno.servicio}</td>

                              <td className="px-4 py-3">{turno.patente}</td>

                              <td className="px-4 py-3 capitalize">
                                {turno.estado.replaceAll("_", " ")}
                              </td>

                              <td className="px-4 py-3 font-semibold">
                                {formatearPrecio(turno.precio_aplicado)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
