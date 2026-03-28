import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  jsonLd?: object;
  canonical?: string;
}

export const SEO = ({
  title,
  description,
  image = "/logo.png",
  url = window.location.href,
  type = "website",
  jsonLd,
  canonical,
}: SEOProps) => {
  const { t } = useTranslation("common");

  const siteName = "KduFoot V2";
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const defaultDesc = t(
    "site_description",
    "KduFoot - La plateforme de référence pour le football amateur",
  );
  const fullDesc = description || defaultDesc;

  const HelmetCast = Helmet as any;

  return (
    <HelmetCast>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta content={fullDesc} name="description" />
      {canonical && <link href={canonical} rel="canonical" />}

      {/* Open Graph / Facebook */}
      <meta content={type} property="og:type" />
      <meta content={url} property="og:url" />
      <meta content={fullTitle} property="og:title" />
      <meta content={fullDesc} property="og:description" />
      <meta content={image} property="og:image" />

      {/* Twitter */}
      <meta content="summary_large_image" name="twitter:card" />
      <meta content={url} name="twitter:url" />
      <meta content={fullTitle} name="twitter:title" />
      <meta content={fullDesc} name="twitter:description" />
      <meta content={image} name="twitter:image" />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </HelmetCast>
  );
};
