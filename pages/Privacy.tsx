import React from 'react';
import { FileText } from 'lucide-react';

// Re-using the layout structure for consistency, defined locally.
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

const Privacy: React.FC = () => {
    return (
        <InfoPageLayout title="Politica de Confidențialitate">
            <p><em>Data ultimei actualizări: {new Date().toLocaleDateString('ro-RO')}</em></p>
            <p>S.C. GIT Brothers S.R.L., operatorul SmartMeter.ro, se angajează să protejeze confidențialitatea datelor dumneavoastră cu caracter personal. Această politică explică modul în care colectăm, utilizăm și protejăm informațiile pe care ni le furnizați.</p>
            
            <h2>1. Ce date colectăm?</h2>
            <p>Colectăm următoarele tipuri de date:</p>
            <ul>
                <li><strong>Date de contact și identificare:</strong> Nume, prenume, adresă de e-mail, număr de telefon, denumirea companiei, CUI/CIF (la facturare).</li>
                <li><strong>Date de facturare și livrare:</strong> Adrese, date bancare (doar în contextul procesării plăților).</li>
                <li><strong>Date tehnice:</strong> Adresa IP, tipul de browser, sistem de operare, colectate prin intermediul cookie-urilor pentru a asigura funcționarea corectă a site-ului.</li>
                <li><strong>Date de client:</strong> Un token unic (<code>sm_client_token</code>) stocat local în browser pentru a permite vizualizarea istoricului de comenzi fără a necesita un cont.</li>
            </ul>

            <h2>2. Cum utilizăm datele dumneavoastră?</h2>
            <p>Utilizăm datele colectate în următoarele scopuri:</p>
            <ul>
                <li><strong>Procesarea comenzilor:</strong> Pentru a vă contacta, a emite facturi proforme și fiscale și pentru a organiza livrarea produselor.</li>
                <li><strong>Comunicare:</strong> Pentru a răspunde solicitărilor dumneavoastră și a oferi suport tehnic.</li>
                <li><strong>Obligații legale:</strong> Pentru a respecta cerințele legale și fiscale privind facturarea și contabilitatea.</li>
                <li><strong>Îmbunătățirea serviciilor:</strong> Pentru a analiza modul de utilizare a site-ului și a îmbunătăți experiența utilizatorilor.</li>
            </ul>

            <h2>3. Partajarea datelor</h2>
            <p>Nu vindem și nu închiriem datele dumneavoastră cu caracter personal către terți. Putem partaja informații cu parteneri de încredere doar atunci când este necesar pentru desfășurarea activității noastre (ex: firme de curierat pentru livrare, servicii de contabilitate).</p>
            
            <h2>4. Securitatea datelor</h2>
            <p>Implementăm măsuri de securitate tehnice și organizatorice pentru a proteja datele dumneavoastră împotriva accesului neautorizat, modificării sau distrugerii. Conexiunea la site este securizată prin protocol HTTPS.</p>

            <h2>5. Drepturile dumneavoastră (GDPR)</h2>
            <p>Conform Regulamentului (UE) 2016/679, aveți următoarele drepturi:</p>
            <ul>
                <li><strong>Dreptul la informare:</strong> Dreptul de a fi informat cu privire la colectarea și utilizarea datelor personale.</li>
                <li><strong>Dreptul de acces:</strong> Dreptul de a accesa datele personale pe care le deținem despre dumneavoastră.</li>
                <li><strong>Dreptul la rectificare:</strong> Dreptul de a solicita corectarea datelor inexacte.</li>
                <li><strong>Dreptul la ștergere ("dreptul de a fi uitat"):</strong> Dreptul de a solicita ștergerea datelor, în anumite condiții.</li>
            </ul>
            <p>Pentru a vă exercita aceste drepturi, ne puteți contacta la adresa de e-mail de pe pagina de contact.</p>
            
            <h2>6. Politica de Cookie-uri</h2>
            <p>Site-ul nostru utilizează cookie-uri esențiale pentru funcționarea sa (ex: menținerea produselor în coș). Nu folosim cookie-uri de marketing sau de urmărire a comportamentului fără consimțământul dumneavoastră explicit.</p>
        </InfoPageLayout>
    );
};

export default Privacy;