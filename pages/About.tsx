import React from 'react';
import { Target, Users, BarChart, Zap } from 'lucide-react';

const About: React.FC = () => {
  return (
    <div className="bg-gray-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Despre SmartMeter.ro</h1>
          <p className="text-lg text-gray-600 mb-12">Partenerul dumneavoastră de încredere în soluții de contorizare inteligentă.</p>
        </div>

        <div className="bg-white p-10 rounded-xl shadow-sm border border-gray-200 max-w-5xl mx-auto mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl font-bold text-primary mb-4">Misiunea Noastră</h2>
              <p className="text-gray-700 leading-relaxed">
                Misiunea SmartMeter.ro este de a furniza companiilor și integratorilor de sisteme din România cele mai avansate și fiabile echipamente de contorizare pentru utilități. Ne dedicăm să oferim soluții personalizate care optimizează managementul consumului, cresc eficiența energetică și susțin dezvoltarea durabilă a partenerilor noștri.
              </p>
            </div>
            <div className="text-center text-accent">
              <Target size={80} className="mx-auto" strokeWidth={1.5}/>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 mb-10 text-center">De ce să ne alegeți?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
              <div className="inline-block bg-primary text-accent p-3 rounded-full mb-4">
                <Users size={32} />
              </div>
              <h3 className="font-bold text-lg mb-2 text-primary">Expertiză B2B</h3>
              <p className="text-sm text-gray-600">Înțelegem nevoile specifice ale mediului de afaceri, de la proiecte industriale complexe la integrări în sisteme de management al clădirilor (BMS).</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
              <div className="inline-block bg-primary text-accent p-3 rounded-full mb-4">
                <Zap size={32} />
              </div>
              <h3 className="font-bold text-lg mb-2 text-primary">Calitate și Fiabilitate</h3>
              <p className="text-sm text-gray-600">Selectăm doar produse de la producători de renume, care respectă cele mai înalte standarde de precizie și durabilitate (MID, ISO).</p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-100 text-center">
              <div className="inline-block bg-primary text-accent p-3 rounded-full mb-4">
                <BarChart size={32} />
              </div>
              <h3 className="font-bold text-lg mb-2 text-primary">Suport Tehnic Dedicat</h3>
              <p className="text-sm text-gray-600">Oferim consultanță specializată pentru alegerea produselor, integrarea în sisteme existente și suport post-vânzare pentru protocoalele de comunicație.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;