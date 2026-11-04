import { Routes, Route } from "react-router";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Inicio from "./pages/Inicio";

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Navbar />

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Inicio />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
