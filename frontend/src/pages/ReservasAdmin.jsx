import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import {
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const partesHoy = Object.fromEntries(
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Argentina/La_Rioja",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .map((parte) => [parte.type, parte.value]),
);

const hoy = `${partesHoy.year}-${partesHoy.month}-${partesHoy.day}`;

async function solicitar(ruta, opciones = {}) {
  const respuesta = await fetch(`${API_URL}${ruta}`, {
    credentials: "include",
    ...opciones,
  });

  const datos = await respuesta.json().catch(() => ({}));

  if (!respuesta.ok) {
    throw new Error(datos.mensaje || "Ocurrió un error.");
  }

  return datos;
}

export default function ReservasAdmin() {
  const { usuario, comprobandoSesion } = useAuth();

  const [clientes, setClientes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [horarios, setHorarios] = useState([]);

  const [idCliente, setIdCliente] = useState("");
  const [idVehiculo, setIdVehiculo] = useState("");
  const [idServicio, setIdServicio] = useState("");
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");

  const [cargando, setCargando] = useState(true);
  const [cargandoVehiculos, setCargandoVehiculos] = useState(false);
  const [cargandoHorarios, setCargandoHorarios] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [actualizacion, setActualizacion] = useState(0);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // Cargar clientes y servicios
  useEffect(() => {
    if (comprobandoSesion || usuario?.rol !== "administrador") {
      return;
    }

    const controller = new AbortController();

    async function cargarDatos() {
      setCargando(true);

      try {
        const [datosClientes, datosServicios] = await Promise.all([
          solicitar("/api/admin/reservas/clientes", {
            signal: controller.signal,
          }),
          solicitar("/api/servicios", {
            signal: controller.signal,
          }),
        ]);

        if (!controller.signal.aborted) {
          setClientes(datosClientes.clientes || []);
          setServicios(datosServicios || []);
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

    cargarDatos();

    return () => controller.abort();
  }, [usuario?.rol, comprobandoSesion]);

  // Cargar vehículos del cliente seleccionado
  useEffect(() => {
    setVehiculos([]);
    setIdVehiculo("");

    if (!idCliente || usuario?.rol !== "administrador") {
      return;
    }

    const controller = new AbortController();

    async function cargarVehiculos() {
      setCargandoVehiculos(true);

      try {
        const datos = await solicitar(
          `/api/admin/reservas/clientes/${idCliente}/vehiculos`,
          { signal: controller.signal },
        );

        if (!controller.signal.aborted) {
          setVehiculos(datos.vehiculos || []);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoVehiculos(false);
        }
      }
    }

    cargarVehiculos();

    return () => controller.abort();
  }, [idCliente, usuario?.rol]);

  // Consultar disponibilidad
  useEffect(() => {
    setHorarios([]);
    setHoraInicio("");

    if (!fecha || !idServicio || usuario?.rol !== "administrador") {
      return;
    }

    const controller = new AbortController();

    async function consultarHorarios() {
      setCargandoHorarios(true);

      try {
        const datos = await solicitar(
          `/api/disponibilidad?fecha=${fecha}&id_servicio=${idServicio}`,
          { signal: controller.signal },
        );

        if (!controller.signal.aborted) {
          setHorarios(
            (datos.horarios || []).filter((horario) => horario.disponible),
          );
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargandoHorarios(false);
        }
      }
    }

    consultarHorarios();

    return () => controller.abort();
  }, [fecha, idServicio, actualizacion, usuario?.rol]);

  // Registrar reserva presencial
  async function registrarReserva(evento) {
    evento.preventDefault();

    if (guardando) return;

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      const datos = await solicitar("/api/admin/reservas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_cliente: Number(idCliente),
          id_vehiculo: Number(idVehiculo),
          id_servicio: Number(idServicio),
          fecha,
          hora_inicio: horaInicio,
        }),
      });

      setMensaje(
        `Reserva #${datos.turno.id_turno} registrada correctamente. ` +
          `Puesto asignado: ${datos.turno.id_puesto}.`,
      );

      setHoraInicio("");
      setActualizacion((anterior) => anterior + 1);
    } catch (error) {
      setError(error.message);
      setActualizacion((anterior) => anterior + 1);
    } finally {
      setGuardando(false);
    }
  }

  if (comprobandoSesion) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoaderCircle className="animate-spin text-sky-600" />
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
      <div className="mx-auto max-w-4xl">
        <Link
          to="/admin"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-900"
        >
          <ArrowLeft size={18} />
          Volver al panel
        </Link>

        <div className="mb-8">
          <h1 className="flex items-center gap-3 text-3xl font-extrabold text-slate-950">
            <CalendarPlus size={32} className="text-sky-600" />
            Nueva reserva presencial
          </h1>

          <p className="mt-3 text-slate-500">
            Registrá turnos recibidos en el establecimiento o por teléfono.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700"
          >
            {error}
          </div>
        )}

        {mensaje && (
          <div
            role="status"
            className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700"
          >
            <CheckCircle2 size={22} />
            {mensaje}
          </div>
        )}

        <form
          onSubmit={registrarReserva}
          className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <h2 className="text-xl font-bold text-slate-900">
            Datos de la reserva
          </h2>

          {cargando ? (
            <p className="text-slate-500">Cargando información...</p>
          ) : (
            <>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Cliente
                </label>

                <select
                  value={idCliente}
                  onChange={(e) => {
                    setIdCliente(e.target.value);
                    setError("");
                    setMensaje("");
                  }}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                >
                  <option value="">Seleccionar cliente</option>

                  {clientes.map((cliente) => (
                    <option key={cliente.id_cliente} value={cliente.id_cliente}>
                      {cliente.apellido}, {cliente.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Vehículo
                </label>

                <select
                  value={idVehiculo}
                  onChange={(e) => setIdVehiculo(e.target.value)}
                  required
                  disabled={!idCliente || cargandoVehiculos}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 disabled:bg-slate-100"
                >
                  <option value="">
                    {cargandoVehiculos
                      ? "Cargando vehículos..."
                      : "Seleccionar vehículo"}
                  </option>

                  {vehiculos.map((vehiculo) => (
                    <option
                      key={vehiculo.id_vehiculo}
                      value={vehiculo.id_vehiculo}
                    >
                      {vehiculo.marca} {vehiculo.modelo} - {vehiculo.patente}
                    </option>
                  ))}
                </select>

                {idCliente && !cargandoVehiculos && vehiculos.length === 0 && (
                  <p className="mt-2 text-sm text-amber-700">
                    Este cliente no tiene vehículos registrados.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Servicio
                </label>

                <select
                  value={idServicio}
                  onChange={(e) => setIdServicio(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                >
                  <option value="">Seleccionar servicio</option>

                  {servicios.map((servicio) => (
                    <option
                      key={servicio.id_servicio}
                      value={servicio.id_servicio}
                    >
                      {servicio.nombre} - {servicio.duracion_minutos} min
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Fecha
                </label>

                <input
                  type="date"
                  min={hoy}
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Horario disponible
                </label>

                <select
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  required
                  disabled={
                    !fecha ||
                    !idServicio ||
                    cargandoHorarios ||
                    horarios.length === 0
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 disabled:bg-slate-100"
                >
                  <option value="">
                    {cargandoHorarios
                      ? "Consultando disponibilidad..."
                      : "Seleccionar horario"}
                  </option>

                  {horarios.map((horario) => (
                    <option
                      key={horario.hora_inicio}
                      value={horario.hora_inicio}
                    >
                      {horario.hora_inicio} a {horario.hora_fin} -{" "}
                      {horario.puestos_disponibles} puesto(s) libre(s)
                    </option>
                  ))}
                </select>

                {fecha &&
                  idServicio &&
                  !cargandoHorarios &&
                  horarios.length === 0 && (
                    <p className="mt-2 text-sm text-amber-700">
                      No hay horarios disponibles para esta fecha.
                    </p>
                  )}
              </div>

              <button
                type="submit"
                disabled={
                  guardando ||
                  cargando ||
                  cargandoVehiculos ||
                  cargandoHorarios ||
                  !idCliente ||
                  !idVehiculo ||
                  !idServicio ||
                  !fecha ||
                  !horaInicio
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3.5 font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {guardando ? (
                  <>
                    <LoaderCircle size={20} className="animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <CalendarPlus size={20} />
                    Confirmar reserva presencial
                  </>
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </section>
  );
}
