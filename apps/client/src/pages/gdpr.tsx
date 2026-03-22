
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Link } from "react-router-dom";
import { Button } from "@heroui/button";

import DefaultLayout from "@/layouts/default";

export default function GDPRPage() {
  return (
    <DefaultLayout maxWidth="max-w-4xl">
      <div className="flex flex-col gap-8 w-full px-4 py-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-linear-to-r from-green-500 to-emerald-600">
            Politique de Confidentialité & RGPD
          </h1>
          <Button as={Link} to="/" variant="flat" size="sm">
            Retour
          </Button>
        </div>

        <p className="text-default-500">
          Ce registre documente le traitement des données personnelles au sein de l'application KduFoot, conformément au Règlement Général sur la Protection des Données (RGPD).
        </p>

        <Card className="border border-default-200 shadow-sm">
          <CardHeader className="font-bold text-lg bg-default-50 border-b border-default-200">
            1. Responsable du Traitement
          </CardHeader>
          <CardBody className="leading-relaxed">
            <p>
              <strong>Entité :</strong> KduFoot (Yanni Delattre-Balcer)<br />
              <strong>Contact DPO :</strong> support@kdufoot.com
            </p>
          </CardBody>
        </Card>

        <Card className="border border-default-200 shadow-sm">
          <CardHeader className="font-bold text-lg bg-default-50 border-b border-default-200">
            2. Données Collectées & Finalité
          </CardHeader>
          <CardBody className="flex flex-col gap-4">
            <div>
              <h4 className="font-bold text-default-900 border-b border-default-100 pb-1 mb-2">Authentification & Profil (Auth0)</h4>
              <ul className="list-disc list-inside text-default-600 text-sm space-y-1">
                <li><strong>Données :</strong> Email, Nom, Prénom, Photo de profil (via Google ou Auth0).</li>
                <li><strong>Finalité :</strong> Identifier l'utilisateur, sécuriser les accès et personnaliser l'expérience.</li>
                <li><strong>Stockage :</strong> Systèmes sécurisés d'Auth0.</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-bold text-default-900 border-b border-default-100 pb-1 mb-2">Profil Utilisateur (Cloudflare D1)</h4>
              <ul className="list-disc list-inside text-default-600 text-sm space-y-1">
                <li><strong>Données :</strong> Numéro de téléphone, Date de Naissance, ID Club (Optionnel).</li>
                <li><strong>Finalité :</strong> Faciliter l'organisation de matchs et le contact entre gérants.</li>
                <li><strong>Stockage :</strong> Cloudflare D1 (Chiffré au repos).</li>
              </ul>
            </div>
          </CardBody>
        </Card>

        <Card className="border border-default-200 shadow-sm">
          <CardHeader className="font-bold text-lg bg-default-50 border-b border-default-200">
            3. Protection des Données
          </CardHeader>
          <CardBody className="text-default-600 text-sm">
            <p>
              KduFoot applique des mesures de sécurité strictes pour protéger vos informations contre tout accès non autorisé. Nous ne partageons vos données avec aucun tiers à des fins commerciales.
            </p>
          </CardBody>
        </Card>

        <Card className="border border-default-200 shadow-sm">
          <CardHeader className="font-bold text-lg bg-default-50 border-b border-default-200">
            4. Droit d'Accès et de Suppression
          </CardHeader>
          <CardBody className="text-default-600 text-sm">
            <p className="mb-2">
              Vous disposez d'un droit d'accès, de rectification et d'effacement complet de vos données. 
            </p>
            <p>
              <strong>Pour exercer vos droits :</strong> Envoyez un email à <a href="mailto:support@kdufoot.com" className="text-primary hover:underline">support@kdufoot.com</a>.
              Un système d'export est également disponible dans vos paramètres de compte.
            </p>
          </CardBody>
        </Card>

      </div>
    </DefaultLayout>
  );
}
