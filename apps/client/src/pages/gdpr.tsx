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
          <Button as={Link} size="sm" to="/" variant="flat">
            Retour
          </Button>
        </div>

        <p className="text-default-500">
          Ce registre documente le traitement des données personnelles au sein
          de l'application KduFoot, conformément au Règlement Général sur la
          Protection des Données (RGPD).
        </p>

        <Card className="border border-default-200 shadow-sm">
          <CardHeader className="font-bold text-lg bg-default-50 border-b border-default-200">
            1. Responsable du Traitement
          </CardHeader>
          <CardBody className="leading-relaxed">
            <p>
              <strong>Entité :</strong> KduFoot (Yanni Delattre-Balcer)
              <br />
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
              <h4 className="font-bold text-default-900 border-b border-default-100 pb-1 mb-2">
                Authentification & Profil (Auth0)
              </h4>
              <ul className="list-disc list-inside text-default-600 text-sm space-y-1">
                <li>
                  <strong>Données :</strong> Email, Nom, Prénom, Photo de profil
                  (via Google ou Auth0).
                </li>
                <li>
                  <strong>Finalité :</strong> Identifier l'utilisateur,
                  sécuriser les accès et personnaliser l'expérience.
                </li>
                <li>
                  <strong>Stockage :</strong> Systèmes sécurisés d'Auth0.
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-default-900 border-b border-default-100 pb-1 mb-2">
                Profil Utilisateur (Cloudflare D1)
              </h4>
              <ul className="list-disc list-inside text-default-600 text-sm space-y-1">
                <li>
                  <strong>Données :</strong> Numéro de téléphone, Date de
                  Naissance, ID Club (Optionnel).
                </li>
                <li>
                  <strong>Finalité :</strong> Faciliter l'organisation de matchs
                  et le contact entre gérants.
                </li>
                <li>
                  <strong>Stockage :</strong> Cloudflare D1 (Chiffré au repos).
                </li>
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
              KduFoot applique des mesures de sécurité strictes pour protéger
              vos informations contre tout accès non autorisé. Nous ne
              partageons vos données avec aucun tiers à des fins commerciales.
            </p>
          </CardBody>
        </Card>

        <Card className="border border-default-200 shadow-sm">
          <CardHeader className="font-bold text-lg bg-default-50 border-b border-default-200">
            4. Durée de Conservation
          </CardHeader>
          <CardBody className="text-default-600 text-sm">
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Compte actif :</strong> Les données sont conservées tant
                que le compte est actif.
              </li>
              <li>
                <strong>Compte supprimé :</strong> Les données sont supprimées
                immédiatement de nos systèmes (D1 + Auth0).
              </li>
              <li>
                <strong>Matchs passés :</strong> Les matchs de plus de 12 mois
                sont automatiquement archivés et anonymisés.
              </li>
              <li>
                <strong>Logs d'audit RGPD :</strong> Conservés 3 ans
                conformément aux obligations légales.
              </li>
            </ul>
          </CardBody>
        </Card>

        <Card className="border border-default-200 shadow-sm">
          <CardHeader className="font-bold text-lg bg-default-50 border-b border-default-200">
            5. Droit d'Accès, Portabilité et Suppression
          </CardHeader>
          <CardBody className="text-default-600 text-sm">
            <p className="mb-2">
              Conformément aux articles 15 à 20 du RGPD, vous disposez d'un
              droit d'accès, de rectification, d'effacement et de portabilité de
              vos données.
            </p>
            <ul className="list-disc list-inside space-y-1 mb-2">
              <li>
                <strong>Export PDF :</strong> Téléchargez un résumé de vos
                données depuis vos paramètres de compte.
              </li>
              <li>
                <strong>Export JSON :</strong> Téléchargez l'intégralité de vos
                données au format JSON (portabilité).
              </li>
              <li>
                <strong>Suppression :</strong> Supprimez votre compte et toutes
                vos données en un clic depuis vos paramètres.
              </li>
            </ul>
            <p>
              <strong>Contact DPO :</strong>{" "}
              <a
                className="text-primary hover:underline"
                href="mailto:support@kdufoot.com"
              >
                support@kdufoot.com
              </a>
            </p>
          </CardBody>
        </Card>
      </div>
    </DefaultLayout>
  );
}
