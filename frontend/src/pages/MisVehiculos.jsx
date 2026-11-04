import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import {
  CarFront,
  ArrowLeft,
  CircleAlert,
  LoaderCircle,
  ShieldCheck,
  Car,
  Plus,
  X,
  Pencil,
  Save,
  Trash2,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

function MisVehiculos() {
  const { usuario, comprobandoSesion } = useAuth();

  const [vehiculos, setVehiculos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  const [nuevoVehiculo, setNuevoVehiculo] = useState({
    patente: "",
    marca: "",
    modelo: "",
  });

  const [guardando, setGuardando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  const [vehiculoEnEdicion, setVehiculoEnEdicion] = useState(null);

  const [datosEdicion, setDatosEdicion] = useState({
    patente: "",
    marca: "",
    modelo: "",
  });

  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState("");

  const [eliminandoId, setEliminandoId] = useState(null);
  const [errorEliminar, setErrorEliminar] = useState("");

  useEffect(() => {
    if (comprobandoSesion || !usuario) {
      return;
    }

    const controller = new AbortController();

    const obtenerVehiculos = async () => {
      setCargando(true);
      setError("");

      try {
        const respuesta = await fetch(`${API_URL}/api/vehiculos`, {
          credentials: "include",
          signal: controller.signal,
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.mensaje || "No se pudieron obtener tus vehículos.",
          );
        }

        if (!controller.signal.aborted) {
          setVehiculos(Array.isArray(datos.vehiculos) ? datos.vehiculos : []);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof TypeError
              ? "No se pudo conectar con el servidor."
              : err.message,
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    };

    obtenerVehiculos();

    return () => controller.abort();
  }, [usuario, comprobandoSesion]);

  const manejarCambioVehiculo = (e) => {
    const { name, value } = e.target;

    setNuevoVehiculo((anterior) => ({
      ...anterior,
      [name]: value,
    }));
  };

  const manejarAgregarVehiculo = async (e) => {
    e.preventDefault();

    setErrorFormulario("");
    setMensajeExito("");

    if (
      !nuevoVehiculo.patente.trim() ||
      !nuevoVehiculo.marca.trim() ||
      !nuevoVehiculo.modelo.trim()
    ) {
      setErrorFormulario("Completá todos los campos.");
      return;
    }

    setGuardando(true);

    try {
      const respuesta = await fetch(`${API_URL}/api/vehiculos`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(nuevoVehiculo),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje || "No se pudo registrar el vehículo.",
        );
      }

      // Agregar el nuevo vehículo a las tarjetas
      setVehiculos((anteriores) => [resultado.vehiculo, ...anteriores]);

      // Limpiar formulario
      setNuevoVehiculo({
        patente: "",
        marca: "",
        modelo: "",
      });

      setMostrarFormulario(false);
      setMensajeExito("¡Vehículo registrado correctamente!");
    } catch (error) {
      setErrorFormulario(
        error instanceof TypeError
          ? "No se pudo conectar con el servidor."
          : error.message,
      );
    } finally {
      setGuardando(false);
    }
  };

  const iniciarEdicion = (vehiculo) => {
    setVehiculoEnEdicion(vehiculo.id_vehiculo);

    setDatosEdicion({
      patente: vehiculo.patente,
      marca: vehiculo.marca,
      modelo: vehiculo.modelo,
    });

    setErrorEdicion("");
    setMensajeExito("");
  };

  const guardarEdicion = async (e) => {
    e.preventDefault();
    setErrorEdicion("");

    setGuardandoEdicion(true);

    try {
      const respuesta = await fetch(
        `${API_URL}/api/vehiculos/${vehiculoEnEdicion}`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(datosEdicion),
        },
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(resultado.mensaje || "No se pudo editar el vehículo.");
      }

      // Actualizar la tarjeta sin recargar la página
      setVehiculos((anteriores) =>
        anteriores.map((vehiculo) =>
          vehiculo.id_vehiculo === resultado.vehiculo.id_vehiculo
            ? resultado.vehiculo
            : vehiculo,
        ),
      );

      setVehiculoEnEdicion(null);
      setMensajeExito("¡Vehículo actualizado correctamente!");
    } catch (error) {
      setErrorEdicion(
        error instanceof TypeError
          ? "No se pudo conectar con el servidor."
          : error.message,
      );
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const eliminarVehiculo = async (vehiculo) => {
    const confirmar = window.confirm(
      `¿Estás seguro de eliminar el vehículo ${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.patente})?`,
    );

    if (!confirmar) return;

    setErrorEliminar("");
    setMensajeExito("");
    setEliminandoId(vehiculo.id_vehiculo);

    try {
      const respuesta = await fetch(
        `${API_URL}/api/vehiculos/${vehiculo.id_vehiculo}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          resultado.mensaje || "No se pudo eliminar el vehículo.",
        );
      }

      // Actualizar la lista sin recargar la página
      setVehiculos((anteriores) =>
        anteriores.filter((item) => item.id_vehiculo !== vehiculo.id_vehiculo),
      );

      setMensajeExito("¡Vehículo eliminado correctamente!");
    } catch (error) {
      setErrorEliminar(
        error instanceof TypeError
          ? "No se pudo conectar con el servidor."
          : error.message,
      );
    } finally {
      setEliminandoId(null);
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
        {/* VOLVER */}
        <Link
          to="/mi-perfil"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-sky-600"
        >
          <ArrowLeft size={18} />
          Volver a Mi Perfil
        </Link>

        {/* ENCABEZADO */}
        <div className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
              Mi cuenta
            </span>

            <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-950">
              Mis vehículos
            </h1>

            <p className="mt-3 max-w-xl text-slate-500">
              Consultá los vehículos asociados a tu cuenta. Próximamente podrás
              agregar autos y utilizarlos al reservar un turno.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* CONTADOR */}
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                <CarFront size={24} />
              </div>

              <div>
                <p className="text-2xl font-extrabold text-slate-950">
                  {vehiculos.length}
                </p>

                <p className="text-xs text-slate-500">Vehículos registrados</p>
              </div>
            </div>

            {/* AGREGAR VEHÍCULO */}
            <button
              type="button"
              onClick={() => {
                setMostrarFormulario(!mostrarFormulario);
                setErrorFormulario("");
                setMensajeExito("");
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 py-4 text-sm font-bold text-white transition hover:bg-sky-600"
            >
              {mostrarFormulario ? (
                <>
                  <X size={19} />
                  Cancelar
                </>
              ) : (
                <>
                  <Plus size={19} />
                  Agregar vehículo
                </>
              )}
            </button>
          </div>
        </div>

        {/* ERROR AL ELIMINAR */}
        {errorEliminar && (
          <div
            role="alert"
            className="mb-8 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-sm font-semibold text-red-700"
          >
            <CircleAlert size={19} />
            {errorEliminar}
          </div>
        )}

        {/* MENSAJE DE ÉXITO */}
        {mensajeExito && (
          <div
            role="status"
            className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 text-sm font-semibold text-emerald-700"
          >
            {mensajeExito}
          </div>
        )}

        {/* FORMULARIO AGREGAR VEHÍCULO */}
        {mostrarFormulario && (
          <div className="mb-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <div className="mb-8">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
                Nuevo vehículo
              </span>

              <h2 className="mt-3 text-2xl font-extrabold text-slate-950">
                Registrar un vehículo
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Completá los datos del auto que querés asociar a tu cuenta.
              </p>
            </div>

            <form onSubmit={manejarAgregarVehiculo} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                {/* PATENTE */}
                <div>
                  <label
                    htmlFor="patente"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Patente
                  </label>

                  <input
                    id="patente"
                    name="patente"
                    type="text"
                    value={nuevoVehiculo.patente}
                    onChange={manejarCambioVehiculo}
                    placeholder="AB123CD"
                    maxLength={12}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm uppercase text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                {/* MARCA */}
                <div>
                  <label
                    htmlFor="marca"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Marca
                  </label>

                  <input
                    id="marca"
                    name="marca"
                    type="text"
                    value={nuevoVehiculo.marca}
                    onChange={manejarCambioVehiculo}
                    placeholder="Toyota"
                    maxLength={50}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </div>

                {/* MODELO */}
                <div>
                  <label
                    htmlFor="modelo"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Modelo
                  </label>

                  <input
                    id="modelo"
                    name="modelo"
                    type="text"
                    value={nuevoVehiculo.modelo}
                    onChange={manejarCambioVehiculo}
                    placeholder="Corolla"
                    maxLength={50}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                  />
                </div>
              </div>

              {/* ERROR */}
              {errorFormulario && (
                <div
                  role="alert"
                  className="flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-600"
                >
                  <CircleAlert size={19} />
                  {errorFormulario}
                </div>
              )}

              {/* BOTONES */}
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-6">
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => {
                    setMostrarFormulario(false);
                    setErrorFormulario("");
                  }}
                  className="rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={guardando}
                  className="flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {guardando ? (
                    <>
                      <LoaderCircle size={19} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Plus size={19} />
                      Guardar vehículo
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CARGANDO */}
        {cargando && (
          <div className="flex min-h-64 items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white text-slate-500">
            <LoaderCircle size={24} className="animate-spin text-sky-500" />
            Cargando tus vehículos...
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

        {/* SIN VEHÍCULOS */}
        {!cargando && !error && vehiculos.length === 0 && (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-sky-50 text-sky-600">
              <CarFront size={40} strokeWidth={1.5} />
            </div>

            <h2 className="text-2xl font-bold text-slate-950">
              Todavía no registraste vehículos
            </h2>

            <p className="mt-3 max-w-md leading-7 text-slate-500">
              Acá aparecerán los autos que registres en Lavadero Rioja. Podrás
              seleccionarlos cuando reserves un servicio.
            </p>

            <span className="mt-7 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">
              Registro de vehículos: próximo paso
            </span>
          </div>
        )}

        {/* LISTA DE VEHÍCULOS */}
        {!cargando && !error && vehiculos.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vehiculos.map((vehiculo) => (
              <article
                key={vehiculo.id_vehiculo}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-36 items-center justify-center bg-[#081727]">
                  <Car size={70} strokeWidth={1.2} className="text-sky-400" />
                </div>

                <div className="p-6">
                  <span className="text-xs font-bold uppercase tracking-widest text-sky-600">
                    Vehículo registrado
                  </span>

                  <h2 className="mt-3 text-xl font-extrabold text-slate-950">
                    {vehiculo.marca} {vehiculo.modelo}
                  </h2>

                  <div className="mt-4 inline-block rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 font-mono text-sm font-bold uppercase tracking-widest text-slate-800">
                    {vehiculo.patente}
                  </div>

                  {/* EDITAR VEHÍCULO */}
                  {vehiculoEnEdicion === vehiculo.id_vehiculo ? (
                    <form onSubmit={guardarEdicion} className="mt-6 space-y-4">
                      {["patente", "marca", "modelo"].map((campo) => (
                        <div key={campo}>
                          <label
                            htmlFor={`editar-${campo}-${vehiculo.id_vehiculo}`}
                            className="mb-2 block text-sm font-semibold capitalize text-slate-700"
                          >
                            {campo}
                          </label>

                          <input
                            id={`editar-${campo}-${vehiculo.id_vehiculo}`}
                            name={campo}
                            type="text"
                            value={datosEdicion[campo]}
                            onChange={(e) =>
                              setDatosEdicion((anterior) => ({
                                ...anterior,
                                [e.target.name]: e.target.value,
                              }))
                            }
                            maxLength={campo === "patente" ? 12 : 50}
                            required
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"
                          />
                        </div>
                      ))}

                      {errorEdicion && (
                        <p role="alert" className="text-sm text-red-600">
                          {errorEdicion}
                        </p>
                      )}

                      <div className="flex gap-3">
                        <button
                          type="button"
                          disabled={guardandoEdicion}
                          onClick={() => setVehiculoEnEdicion(null)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-600 disabled:opacity-50"
                        >
                          <X size={17} />
                          Cancelar
                        </button>

                        <button
                          type="submit"
                          disabled={guardandoEdicion}
                          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 px-3 py-3 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-60"
                        >
                          <Save size={17} />
                          {guardandoEdicion ? "Guardando..." : "Guardar"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => iniciarEdicion(vehiculo)}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700 transition hover:bg-sky-100"
                    >
                      <Pencil size={17} />
                      Editar vehículo
                    </button>
                  )}

                  {/* ELIMINAR VEHÍCULO */}
                  {vehiculoEnEdicion !== vehiculo.id_vehiculo && (
                    <button
                      type="button"
                      onClick={() => eliminarVehiculo(vehiculo)}
                      disabled={eliminandoId === vehiculo.id_vehiculo}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 size={17} />

                      {eliminandoId === vehiculo.id_vehiculo
                        ? "Eliminando..."
                        : "Eliminar vehículo"}
                    </button>
                  )}

                  <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-5 text-xs font-medium text-emerald-700">
                    <ShieldCheck size={17} />
                    Asociado a tu cuenta
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default MisVehiculos;
