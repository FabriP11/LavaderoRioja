import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3002";

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [comprobandoSesion, setComprobandoSesion] = useState(true);

  // Comprobar sesión al cargar la aplicación
  useEffect(() => {
    const controller = new AbortController();

    async function comprobarSesion() {
      try {
        const respuesta = await fetch(`${API_URL}/api/sesion`, {
          credentials: "include",
          signal: controller.signal,
        });

        if (!respuesta.ok) {
          throw new Error("Sin sesión válida");
        }

        const datos = await respuesta.json();

        if (!controller.signal.aborted) {
          setUsuario(datos.usuario);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setUsuario(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setComprobandoSesion(false);
        }
      }
    }

    comprobarSesion();

    return () => controller.abort();
  }, []);

  // Iniciar sesión
  const iniciarSesion = async (identificador, contrasena) => {
    const respuesta = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        identificador,
        contrasena,
      }),
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.mensaje || "No se pudo iniciar sesión.");
    }

    setUsuario(datos.usuario);

    return datos.usuario;
  };

  // Cerrar sesión
  const cerrarSesion = async () => {
    const respuesta = await fetch(`${API_URL}/api/logout`, {
      method: "POST",
      credentials: "include",
    });

    if (!respuesta.ok) {
      throw new Error("No se pudo cerrar la sesión.");
    }

    setUsuario(null);
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        comprobandoSesion,
        iniciarSesion,
        cerrarSesion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);

  if (!contexto) {
    throw new Error("useAuth debe utilizarse dentro de AuthProvider");
  }

  return contexto;
}
