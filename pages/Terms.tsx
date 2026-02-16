import React from 'react';
import { FileText } from 'lucide-react';

const InfoPageLayout: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-gray-50 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
            <h1 className="text-3xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                <FileText className="text-accent" size={28} />
                {title}
            </h1>
            <div className="bg-white p-8 md:p-10 rounded-lg shadow-sm border border-gray-200 prose max-w-none prose-h2:text-primary prose-h2:border-b prose-h2:pb-2 prose-a:text-accent">
                {children}
            </div>
        </div>
    </div>
);

const Terms: React.FC = () => {
    return (
        <InfoPageLayout title="Termeni și Condiții">
            <h2>1. Definiții</h2>
            <p><strong>SmartMeter.ro</strong> (denumit în continuare "Site-ul") este un domeniu operat de S.C. GIT Brothers S.R.L., o companie B2B specializată în furnizarea de soluții de contorizare inteligentă.</p>
            <p><strong>Utilizator:</strong> Orice persoană fizică sau juridică care accesează și utilizează acest site în scop profesional.</p>
            <p><strong>Produs:</strong> Echipamentele de contorizare și accesoriile aferente listate pe site.</p>

            <h2>2. Acceptarea Termenilor</h2>
            <p>Prin utilizarea acestui site, sunteți de acord cu termenii și condițiile prezentate. Dacă nu sunteți de acord cu acești termeni, vă rugăm să nu utilizați site-ul.</p>

            <h2>3. Plasarea Comenzilor</h2>
            <p>Plasarea unei comenzi pe site reprezintă o <strong>cerere de ofertă</strong> din partea dumneavoastră. Comenzile nu sunt procesate automat. După plasarea comenzii, un reprezentant SmartMeter.ro vă va contacta pentru a confirma disponibilitatea produselor, prețurile finale (care pot include costuri de transport sau alte taxe specifice) și pentru a emite o factură proformă.</p>
            <p>Contractul se consideră încheiat în momentul acceptării ofertei finale și efectuării plății conform facturii proforme.</p>

            <h2>4. Prețuri și Plată</h2>
            <p>Toate prețurile afișate pe site sunt exprimate în RON și <strong>nu includ TVA</strong>. Plata se va efectua prin transfer bancar, pe baza facturii proforme emise de către compania noastră.</p>

            <h2>5. Livrare</h2>
            <p>Livrarea produselor se face prin curier rapid. Termenul de livrare va fi comunicat de către reprezentantul nostru după confirmarea comenzii și depinde de stocul disponibil. Costurile de transport sunt suportate de către client, cu excepția cazului în care se agreează altfel.</p>

            <h2>6. Garanție și Retur</h2>
            <p>Produsele beneficiază de garanția oferită de producător. Condițiile de garanție sunt specifice fiecărui produs. Fiind o platformă B2B, legislația privind dreptul de retur pentru consumatori (persoane fizice) nu se aplică. Orice problemă legată de conformitatea produselor va fi tratată conform legilor în vigoare pentru contractele între persoane juridice.</p>

            <h2>7. Limitarea Răspunderii</h2>
            <p>SmartMeter.ro depune toate eforturile pentru a asigura corectitudinea informațiilor prezentate. Totuși, nu ne asumăm răspunderea pentru eventualele erori tehnice sau de conținut. Specificațiile tehnice sunt cu titlu informativ și pot fi modificate de producător fără notificare prealabilă.</p>

            <h2>8. Drepturi de Proprietate Intelectuală</h2>
            <p>Conținutul acestui site (texte, imagini, logo-uri) este proprietatea S.C. GIT Brothers S.R.L. și este protejat de legislația privind drepturile de autor. Orice utilizare neautorizată este strict interzisă.</p>
        </InfoPageLayout>
    );
};

export default Terms;