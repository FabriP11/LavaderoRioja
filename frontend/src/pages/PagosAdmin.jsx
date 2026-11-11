import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, CreditCard } from "lucide-react";

const API_URL = "http://localhost:3001";

const formatoPrecio = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

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

export default function PagosAdmin() {
  const [turnos, setTurnos] = useState([]);
  const [pagos, setPagos] = useState([]);

  const [idTurno, setIdTurno] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");

  const [cargando, setCargando] = useState(true);
  const [registrando, setRegistrando] = useState(false);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  // Consultar reservas y pagos
  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError("");

    try {
      const [datosTurnos, datosPagos] = await Promise.all([
        solicitar("/api/admin/turnos"),
        solicitar("/api/admin/pagos"),
      ]);

      setTurnos(datosTurnos.turnos || []);
      setPagos(datosPagos.pagos || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Filtrar turnos finalizados o entregados que no tengan pago
  const turnosPendientes = useMemo(() => {
    const turnosPagados = new Set(pagos.map((pago) => Number(pago.id_turno)));

    return turnos.filter(
      (turno) =>
        ["finalizado", "entregado"].includes(turno.estado) &&
        !turnosPagados.has(Number(turno.id_turno)),
    );
  }, [turnos, pagos]);

  // Obtener el turno seleccionado
  const turnoSeleccionado = turnosPendientes.find(
    (turno) => Number(turno.id_turno) === Number(idTurno),
  );

  // Registrar un pago
  async function registrarPago(evento) {
    evento.preventDefault();

    if (!turnoSeleccionado || registrando) return;

    setRegistrando(true);
    setError("");
    setMensaje("");

    try {
      await solicitar("/api/admin/pagos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_turno: Number(idTurno),
          metodo_pago: metodoPago,
        }),
      });

      setIdTurno("");
      setMetodoPago("efectivo");

      await cargarDatos();

      setMensaje("Pago registrado correctamente.");
    } catch (error) {
      setError(error.message);
    } finally {
      setRegistrando(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      {/* Encabezado */}
      <Link
        to="/admin"
        className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-blue-700"
      >
        <ArrowLeft size={18} />
        Volver al panel
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl bg-blue-100 p-3 text-blue-700">
          <CreditCard size={28} />
        </div>

        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Gestión de pagos
          </h1>

          <p className="mt-1 text-slate-600">
            Registrá los cobros de los servicios realizados.
          </p>
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {mensaje && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          {mensaje}
        </div>
      )}

      {cargando ? (
        <p className="text-slate-600">Cargando información...</p>
      ) : (
        <>
          {/* Registrar pago */}
          <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-slate-900">
              Registrar pago
            </h2>

            {turnosPendientes.length === 0 ? (
              <p className="text-slate-600">
                No hay turnos finalizados o entregados pendientes de pago.
              </p>
            ) : (
              <form onSubmit={registrarPago} className="space-y-5">
                <div>
                  <label
                    htmlFor="turno"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Seleccionar turno
                  </label>

                  <select
                    id="turno"
                    value={idTurno}
                    onChange={(e) => setIdTurno(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="">Seleccionar un turno</option>

                    {turnosPendientes.map((turno) => (
                      <option key={turno.id_turno} value={turno.id_turno}>
                        #{turno.id_turno} - {turno.cliente_nombre}{" "}
                        {turno.cliente_apellido} - {turno.servicio}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Detalles del turno */}
                {turnoSeleccionado && (
                  <div className="rounded-xl bg-slate-50 p-4">
                    <h3 className="mb-3 font-semibold text-slate-800">
                      Detalles del turno
                    </h3>

                    <div className="space-y-2 text-sm text-slate-700">
                      <p>
                        <strong>Cliente:</strong>{" "}
                        {turnoSeleccionado.cliente_nombre}{" "}
                        {turnoSeleccionado.cliente_apellido}
                      </p>

                      <p>
                        <strong>Vehículo:</strong> {turnoSeleccionado.marca}{" "}
                        {turnoSeleccionado.modelo} - {turnoSeleccionado.patente}
                      </p>

                      <p>
                        <strong>Servicio:</strong> {turnoSeleccionado.servicio}
                      </p>

                      <p>
                        <strong>Estado:</strong> {turnoSeleccionado.estado}
                      </p>

                      <p className="text-lg font-bold text-blue-700">
                        Importe:{" "}
                        {formatoPrecio.format(
                          Number(turnoSeleccionado.precio_aplicado),
                        )}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="metodoPago"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Método de pago
                  </label>

                  <select
                    id="metodoPago"
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={!turnoSeleccionado || registrando}
                  className="rounded-lg bg-blue-700 px-6 py-3 font-medium text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {registrando ? "Registrando..." : "Registrar pago"}
                </button>
              </form>
            )}
          </section>

          {/* Listado de pagos */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-900">
                Pagos registrados
              </h2>

              <button
                type="button"
                onClick={cargarDatos}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
              >
                Actualizar
              </button>
            </div>

            {pagos.length === 0 ? (
              <p className="text-slate-600">
                Todavía no hay pagos registrados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-4 py-3">Turno</th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Servicio</th>
                      <th className="px-4 py-3">Importe</th>
                      <th className="px-4 py-3">Método</th>
                      <th className="px-4 py-3">Fecha</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {pagos.map((pago) => (
                      <tr key={pago.id_pago} className="hover:bg-slate-50">
                        <td className="px-4 py-3">#{pago.id_turno}</td>

                        <td className="px-4 py-3">
                          {pago.cliente_nombre} {pago.cliente_apellido}
                        </td>

                        <td className="px-4 py-3">{pago.servicio}</td>

                        <td className="px-4 py-3 font-semibold">
                          {formatoPrecio.format(Number(pago.monto))}
                        </td>

                        <td className="px-4 py-3 capitalize">
                          {pago.metodo_pago}
                        </td>

                        <td className="px-4 py-3">{pago.fecha_pago}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
