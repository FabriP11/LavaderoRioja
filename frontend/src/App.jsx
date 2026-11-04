import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [servicios, setServicios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const cargarServicios = async () => {
      try {
        const respuesta = await fetch("http://localhost:3001/api/servicios", {
          signal: controller.signal,
        });

        if (!respuesta.ok) {
          throw new Error("Error al cargar servicios");
        }

        const datos = await respuesta.json();
        setServicios(datos);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError("No se pudieron cargar los servicios.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    };

    cargarServicios();

    return () => controller.abort();
  }, []);

  const formatearPrecio = (precio) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(Number(precio));
  };

  return (
    <div className="sitio">
      <header className="navbar">
        <div className="logo">
          <span>💧</span> Lavadero<span>Rioja</span>
        </div>

        <nav>
          <a href="#inicio">Inicio</a>
          <a href="#servicios">Servicios</a>
        </nav>
      </header>

      <main>
        <section className="hero" id="inicio">
          <div className="hero-contenido">
            <span className="etiqueta">LAVADERO DE AUTOS</span>

            <h1>
              Tu auto impecable,
              <span> sin complicaciones.</span>
            </h1>

            <p>
              Conocé nuestros servicios de lavado. Próximamente podrás reservar
              tu turno online de forma rápida y sencilla.
            </p>

            <a href="#servicios" className="boton-principal">
              Ver servicios
            </a>
          </div>
        </section>

        <section className="servicios" id="servicios">
          <div className="seccion-encabezado">
            <span className="subtitulo">NUESTROS SERVICIOS</span>

            <h2>Elegí el lavado ideal</h2>

            <p>Tenemos diferentes opciones para mantener tu vehículo limpio.</p>
          </div>

          {cargando && <p className="mensaje">Cargando servicios...</p>}

          {error && <p className="mensaje error">{error}</p>}

          {!cargando && !error && servicios.length === 0 && (
            <p className="mensaje">No hay servicios disponibles.</p>
          )}

          <div className="servicios-grid">
            {servicios.map((servicio) => (
              <article className="servicio-card" key={servicio.id_servicio}>
                <div className="servicio-icono">🚘</div>

                <h3>{servicio.nombre}</h3>

                <p className="descripcion">{servicio.descripcion}</p>

                <div className="servicio-detalles">
                  <span>⏱ {servicio.duracion_minutos} min</span>
                </div>

                <div className="servicio-precio">
                  {formatearPrecio(servicio.precio)}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>© Lavadero Rioja — La Rioja, Argentina</p>
      </footer>
    </div>
  );
}

export default App;
