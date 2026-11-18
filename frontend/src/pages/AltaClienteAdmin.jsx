import { useState } from "react";
import { Link, Navigate } from "react-router";
import { ArrowLeft, UserPlus, CarFront, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function AltaClienteAdmin() {
  const { usuario, comprobandoSesion } = useAuth();

  const [formulario, setFormulario] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    patente: "",
    marca: "",
    modelo: "",
  });

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState(null);

  function cambiar(campo, valor) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
    }));
  }

  async function registrar(evento) {
    evento.preventDefault();

    if (guardando) return;

    setGuardando(true);
    setError("");
    setResultado(null);

    try {
      const respuesta = await fetch(
        `${API_URL}/api/admin/clientes/presencial`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formulario),
        },
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || "No se pudo registrar el cliente.");
      }

      setResultado(datos);

      setFormulario({
        nombre: "",
        apellido: "",
        telefono: "",
        patente: "",
        marca: "",
        modelo: "",
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setGuardando(false);
    }
  }

  if (comprobandoSesion) {
    return (
      <div className="p-10 text-center text-slate-500">
        Comprobando permisos...
      </div>
    );
  }

  if (!usuario) return <Navigate to="/login" replace />;

  if (usuario.rol !== "administrador") {
    return <Navigate to="/" replace />;
  }

  const campos = [
    { nombre: "nombre", titulo: "Nombre" },
    { nombre: "apellido", titulo: "Apellido" },
    { nombre: "telefono", titulo: "Teléfono" },
    { nombre: "patente", titulo: "Patente" },
    { nombre: "marca", titulo: "Marca" },
    { nombre: "modelo", titulo: "Modelo" },
  ];

  return (
    <section className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/admin/clientes"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-sky-700"
        >
          <ArrowLeft size={18} />
          Volver a clientes
        </Link>

        <div className="mb-8">
          <h1 className="flex items-center gap-3 text-3xl font-extrabold text-slate-950">
            <UserPlus size={30} className="text-sky-600" />
            Nuevo cliente presencial
          </h1>

          <p className="mt-3 text-slate-500">
            Registrá un cliente y su vehículo sin crear una cuenta web.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl bg-red-50 p-4 text-red-700"
          >
            {error}
          </div>
        )}

        {resultado && (
          <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-5 text-green-800">
            <p className="flex items-center gap-2 font-bold">
              <CheckCircle2 size={20} />
              {resultado.mensaje}
            </p>

            <p className="mt-2 text-sm">
              Cliente #{resultado.cliente.id_cliente} —{" "}
              {resultado.cliente.nombre} {resultado.cliente.apellido}
            </p>

            <p className="mt-1 text-sm">
              Vehículo: {resultado.vehiculo.patente}
            </p>

            <Link
              to="/admin/reservas"
              className="mt-4 inline-block rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
            >
              Registrar una reserva
            </Link>
          </div>
        )}

        <form
          onSubmit={registrar}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <h2 className="mb-5 text-xl font-bold text-slate-900">
            Datos del cliente
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            {campos.map((campo, indice) => (
              <div key={campo.nombre}>
                {indice === 3 && (
                  <h2 className="mb-5 flex items-center gap-2 text-xl font-bold text-slate-900 sm:col-span-2">
                    <CarFront size={21} className="text-sky-600" />
                    Datos del vehículo
                  </h2>
                )}

                <label
                  htmlFor={campo.nombre}
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  {campo.titulo}
                </label>

                <input
                  id={campo.nombre}
                  type={campo.nombre === "telefono" ? "tel" : "text"}
                  value={formulario[campo.nombre]}
                  onChange={(e) => cambiar(campo.nombre, e.target.value)}
                  required
                  maxLength={
                    ["nombre", "apellido"].includes(campo.nombre)
                      ? 100
                      : campo.nombre === "telefono"
                        ? 30
                        : campo.nombre === "patente"
                          ? 15
                          : 50
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-400"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="mt-8 w-full rounded-xl bg-sky-600 px-6 py-3.5 font-bold text-white transition hover:bg-sky-700 disabled:opacity-50"
          >
            {guardando ? "Registrando..." : "Registrar cliente y vehículo"}
          </button>
        </form>
      </div>
    </section>
  );
}
