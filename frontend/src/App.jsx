import { Routes, Route } from "react-router";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Inicio from "./pages/Inicio";
import Registro from "./pages/Registro";
import Login from "./pages/Login";
import MiPerfil from "./pages/MiPerfil";
import MisVehiculos from "./pages/MisVehiculos";
import ReservarTurno from "./pages/ReservarTurno";
import MisTurnos from "./pages/MisTurnos";

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/login" element={<Login />} />
          <Route path="/mi-perfil" element={<MiPerfil />} />
          <Route path="/mis-vehiculos" element={<MisVehiculos />} />
          <Route path="/reservar-turno" element={<ReservarTurno />} />
          <Route path="/mis-turnos" element={<MisTurnos />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
