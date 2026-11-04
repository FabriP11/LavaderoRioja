import { Droplets } from "lucide-react";

function Footer() {
  return (
    <footer className="bg-[#081727] py-10 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-6 text-center md:flex-row lg:px-8">
        <div className="flex items-center gap-2">
          <Droplets className="text-sky-400" />

          <span className="font-bold">
            Lavadero
            <span className="text-sky-400">Rioja</span>
          </span>
        </div>

        <p className="text-sm text-slate-400">
          La Rioja, Argentina · Proyecto académico
        </p>

        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} Lavadero Rioja
        </p>
      </div>
    </footer>
  );
}

export default Footer;
