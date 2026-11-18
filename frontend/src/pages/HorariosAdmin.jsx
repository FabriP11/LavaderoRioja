import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import {
  ArrowLeft,
  Clock3,
  Plus,
  Pencil,
  Save,
  X,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const dias = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

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

export default function HorariosAdmin() {
  const { usuario, comprobandoSesion } = useAuth();

  const [horarios, setHorarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [actualizacion, setActualizacion] = useState(0);

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  const [editando, setEditando] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const [nuevo, setNuevo] = useState({
    dia_semana: "1",
    hora_inicio: "09:00",
    hora_fin: "13:00",
  });

  // Consultar horarios
  useEffect(() => {
    if (comprobandoSesion || usuario?.rol !== "administrador") {
      return;
    }

    let activo = true;

    async function cargarHorarios() {
      setCargando(true);

      try {
        const datos = await solicitar("/api/admin/horarios");

        if (activo) {
          setHorarios(datos.horarios || []);
          setError("");
        }
      } catch (error) {
        if (activo) {
          setError(error.message);
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarHorarios();

    return () => {
      activo = false;
    };
  }, [usuario, comprobandoSesion, actualizacion]);

  // Agregar una franja horaria
  async function agregarHorario(evento) {
    evento.preventDefault();

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      await solicitar("/api/admin/horarios", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dia_semana: Number(nuevo.dia_semana),
          hora_inicio: nuevo.hora_inicio,
          hora_fin: nuevo.hora_fin,
          activo: 1,
        }),
      });

      setMensaje("Horario agregado correctamente.");
      setActualizacion((anterior) => anterior + 1);
    } catch (error) {
      setError(error.message);
    } finally {
      setGuardando(false);
    }
  }

  // Preparar la edición
  function comenzarEdicion(horario) {
    setEditando({
      id_horario: horario.id_horario,
      hora_inicio: horario.hora_inicio,
      hora_fin: horario.hora_fin,
      activo: Number(horario.activo) === 1,
    });

    setError("");
    setMensaje("");
  }

  // Guardar los cambios de una franja
  async function guardarEdicion(evento) {
    evento.preventDefault();

    if (!editando) return;

    setGuardando(true);
    setError("");
    setMensaje("");

    try {
      await solicitar(`/api/admin/horarios/${editando.id_horario}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hora_inicio: editando.hora_inicio,
          hora_fin: editando.hora_fin,
          activo: editando.activo,
        }),
      });

      setEditando(null);
      setMensaje("Horario actualizado correctamente.");
      setActualizacion((anterior) => anterior + 1);
    } catch (error) {
      setError(error.message);
    } finally {
      setGuardando(false);
    }
  }

  // Proteger la página
  if (comprobandoSesion) {
    return (
      <div className="p-10 text-center text-slate-500">
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
      <div className="mx-auto max-w-6xl">
        {/* VOLVER */}
        <Link
          to="/admin"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-sky-700 hover:text-sky-900"
        >
          <ArrowLeft size={18} />
          Volver al panel
        </Link>

        {/* ENCABEZADO */}
        <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-extrabold text-slate-950">
              <Clock3 className="text-sky-600" size={32} />
              Horarios de atención
            </h1>

            <p className="mt-3 text-slate-500">
              Administrá los días y las franjas horarias del lavadero.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActualizacion((n) => n + 1)}
            disabled={cargando}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw size={18} />
            Actualizar
          </button>
        </div>

        {/* MENSAJES */}
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
            className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-700"
          >
            {mensaje}
          </div>
        )}

        {/* AGREGAR HORARIO */}
        <div className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-slate-900">
            <Plus size={22} className="text-sky-600" />
            Agregar horario
          </h2>

          <form
            onSubmit={agregarHorario}
            className="grid gap-4 md:grid-cols-4 md:items-end"
          >
            <div>
              <label className="mb-2 block text-sm font-semibold">Día</label>

              <select
                value={nuevo.dia_semana}
                onChange={(e) =>
                  setNuevo({
                    ...nuevo,
                    dia_semana: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                {dias.map((dia, indice) => (
                  <option key={dia} value={indice + 1}>
                    {dia}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Apertura
              </label>

              <input
                type="time"
                value={nuevo.hora_inicio}
                onChange={(e) =>
                  setNuevo({
                    ...nuevo,
                    hora_inicio: e.target.value,
                  })
                }
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Cierre</label>

              <input
                type="time"
                value={nuevo.hora_fin}
                onChange={(e) =>
                  setNuevo({
                    ...nuevo,
                    hora_fin: e.target.value,
                  })
                }
                required
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 font-bold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              <Plus size={18} />
              Agregar
            </button>
          </form>
        </div>

        {/* LISTADO POR DÍA */}
        {cargando ? (
          <p className="text-center text-slate-500">Cargando horarios...</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {dias.map((dia, indice) => {
              const horariosDia = horarios.filter(
                (horario) => Number(horario.dia_semana) === indice + 1,
              );

              return (
                <div
                  key={dia}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <h2 className="mb-5 text-xl font-bold text-slate-900">
                    {dia}
                  </h2>

                  {horariosDia.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Sin horarios configurados.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {horariosDia.map((horario) => {
                        const esEditando =
                          editando?.id_horario === horario.id_horario;

                        if (esEditando) {
                          return (
                            <form
                              key={horario.id_horario}
                              onSubmit={guardarEdicion}
                              className="space-y-3 rounded-xl bg-slate-50 p-4"
                            >
                              <div className="grid grid-cols-2 gap-3">
                                <input
                                  type="time"
                                  value={editando.hora_inicio}
                                  onChange={(e) =>
                                    setEditando({
                                      ...editando,
                                      hora_inicio: e.target.value,
                                    })
                                  }
                                  required
                                  className="w-full min-w-0 rounded-lg border border-slate-300 p-2"
                                />

                                <input
                                  type="time"
                                  value={editando.hora_fin}
                                  onChange={(e) =>
                                    setEditando({
                                      ...editando,
                                      hora_fin: e.target.value,
                                    })
                                  }
                                  required
                                  className="w-full min-w-0 rounded-lg border border-slate-300 p-2"
                                />
                              </div>

                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={editando.activo}
                                  onChange={(e) =>
                                    setEditando({
                                      ...editando,
                                      activo: e.target.checked,
                                    })
                                  }
                                />
                                Horario activo
                              </label>

                              <div className="flex gap-2">
                                <button
                                  type="submit"
                                  disabled={guardando}
                                  className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                  <Save size={16} />
                                  Guardar
                                </button>

                                <button
                                  type="button"
                                  disabled={guardando}
                                  onClick={() => setEditando(null)}
                                  className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm"
                                >
                                  <X size={16} />
                                  Cancelar
                                </button>
                              </div>
                            </form>
                          );
                        }

                        return (
                          <div
                            key={horario.id_horario}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"
                          >
                            <div>
                              <p className="font-bold text-slate-900">
                                {horario.hora_inicio} a {horario.hora_fin}
                              </p>

                              <span
                                className={`mt-1 inline-block text-xs font-semibold ${
                                  Number(horario.activo) === 1
                                    ? "text-green-700"
                                    : "text-red-600"
                                }`}
                              >
                                {Number(horario.activo) === 1
                                  ? "Activo"
                                  : "Inactivo"}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => comenzarEdicion(horario)}
                              disabled={guardando}
                              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                            >
                              <Pencil size={16} />
                              Editar
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
