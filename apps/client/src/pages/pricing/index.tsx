import { useTranslation } from "react-i18next";
import DefaultLayout from "../../layouts/default";
import { Card, CardBody, CardHeader, CardFooter } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import FootballClock from '../../components/football-clock';

export default function PricingPage() {
  const { t } = useTranslation();

  const plans = [
    {
      key: "discovery",
      price: t("pricing.plans.discovery.price"),
      oneTime: true,
      color: "default" as const,
      gradient: "from-blue-500/15 to-cyan-500/5",
      featuresCount: 4,
    },
    {
      key: "starter",
      price: t("pricing.plans.starter.price"),
      color: "primary" as const,
      gradient: "from-green-500/15 to-emerald-500/5",
      featuresCount: 4,
    },
    {
      key: "pro",
      price: t("pricing.plans.pro.price"),
      color: "secondary" as const,
      gradient: "from-orange-500/20 to-red-500/10",
      featuresCount: 4,
      popular: true,
    },
    {
      key: "elite",
      price: t("pricing.plans.elite.price"),
      color: "warning" as const,
      gradient: "from-yellow-500/25 to-amber-500/15",
      featuresCount: 4,
    },
  ];

  return (
    <DefaultLayout maxWidth="max-w-full">
      <section className="flex flex-col gap-10 w-full px-4">

        {/* Hero - Abonnements */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-yellow-500/15 via-amber-500/10 to-orange-500/10 border border-yellow-400/20">
          {/* Grass stripes - standard green */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(34,197,94,0.3) 40px, rgba(34,197,94,0.3) 80px)' }}></div>
          {/* Field center line + circle */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-gradient-to-b from-transparent via-white/5 to-transparent"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full border border-white/5"></div>

          {/* Football clock - top right */}
          <div className="hidden md:block absolute top-4 right-4 z-10">
            <FootballClock size={140} />
          </div>

          <div className="relative flex flex-col items-center gap-6 py-14 px-6 text-center">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-yellow-400/10">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-yellow-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455-2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                </svg>
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-amber-500">
                {t("pricing.hero.title")}
              </h1>
            </div>
            <p className="text-default-500 text-lg max-w-lg">
              {t("pricing.hero.subtitle")}
            </p>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const features = Array.from({ length: plan.featuresCount }).map((_, i) => t(`pricing.plans.${plan.key}.features.${i}`));

            return (
              <Card
                key={plan.key}
                className={`relative overflow-hidden border ${plan.popular ? 'border-primary shadow-lg shadow-primary/10 scale-105 z-10' : 'border-default-200'}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${plan.gradient}`}></div>
                {plan.popular && (
                  <div className="absolute top-3 right-3">
                    <Chip size="sm" color="primary" variant="solid">{t(`pricing.plans.${plan.key}.popular`)}</Chip>
                  </div>
                )}
                <CardHeader className="relative flex flex-col items-center pt-8 pb-2">
                  <h3 className="text-xl font-bold">{t(`pricing.plans.${plan.key}.name`)}</h3>
                  <div className="flex items-baseline gap-1 mt-3">
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                    <span className="text-sm text-default-500 font-medium">
                      {plan.oneTime ? t("pricing.one_time") : t("pricing.period")}
                    </span>
                  </div>
                </CardHeader>
                <CardBody className="relative px-6 py-4">
                  <ul className="flex flex-col gap-3">
                    {features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-success flex-shrink-0">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                        </svg>
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardBody>
                <CardFooter className="relative px-6 pb-6">
                  <Button
                    fullWidth
                    color={plan.color}
                    variant={plan.popular ? "shadow" : "solid"}
                    className="font-bold"
                  >
                    {t(`pricing.plans.${plan.key}.cta`)}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </section>
    </DefaultLayout>
  );
}
