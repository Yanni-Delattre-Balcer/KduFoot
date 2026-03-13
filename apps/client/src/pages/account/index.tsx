import DefaultLayout from "@/layouts/default";
import { AccountSettings } from "@/components/account-settings";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { useTranslation } from "react-i18next";
import { useUser } from "@/authentication/providers/user-provider";

export default function AccountPage() {
    const { t } = useTranslation();
    const { user } = useUser();

    let hasMultipleClubs = false;
    if (Array.isArray(user?.additional_sirets) && user.additional_sirets.length > 0) {
        hasMultipleClubs = true;
    }

    return (
        <DefaultLayout>
            <div className="container mx-auto max-w-5xl p-4 md:p-8 space-y-8 animate-appearance-in pb-24">
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-black text-white tracking-tighter">
                        {t('nav.userPrefix', 'Mon')} <span className="text-primary">Compte</span>
                    </h1>
                    <p className="text-default-500 font-medium">
                        Gérez vos informations personnelles et les détails de votre club certifié.
                    </p>
                    {hasMultipleClubs && (
                        <div className="mt-4 p-4 bg-warning-50/10 border border-warning-500/30 rounded-xl flex items-start gap-3 animate-appearance-in shadow-lg shadow-warning-500/5">
                            <span className="text-warning-500 text-xl font-black flex-shrink-0 animate-pulse">💡</span>
                            <p className="text-sm font-semibold text-warning-200 leading-relaxed">
                                Vous gérez actuellement plusieurs clubs. Pour toute modification sur votre club principal, veuillez contacter le support.
                            </p>
                        </div>
                    )}
                </div>

                <Card className="border border-default-100 bg-[#18181b] shadow-xl w-full">
                    <CardHeader className="bg-[#232120] border-b border-default-100/10 px-6 py-5 md:px-8 md:py-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-white">Informations du Profil</h2>
                        </div>
                    </CardHeader>
                    <CardBody className="p-4 md:p-8">
                        <AccountSettings />
                    </CardBody>
                </Card>
            </div>
        </DefaultLayout>
    );
}
