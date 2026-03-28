import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@heroui/button";
import { useDisclosure } from "@heroui/modal";
import { addToast } from "@heroui/toast";

import DataWall from "@/components/data-wall";
import { useWelcomeGateway } from "@/contexts/welcome-gateway-context";
import { useAuth, useUser } from "@/authentication";
import { useMatch, useMyParticipations } from "@/hooks/use-matches";
import DefaultLayout from "@/layouts/default";
import { MatchDetailsSkeleton } from "@/components/skeletons/match-details-skeleton";
import { SEO } from "@/components/seo";

// New Refactored Components
import { useMatchHighlights } from "@/hooks/use-match-highlights";
import { MatchHeader } from "@/components/matches/details/match-header";
import { InfoGrid } from "@/components/matches/details/info-grid";
import { ModificationBanner } from "@/components/matches/details/modification-banner";
import { AdditionalInfo } from "@/components/matches/details/additional-info";
import { MatchNotes } from "@/components/matches/details/match-notes";
import { ParticipationSection } from "@/components/matches/details/participation-section";
import { ContactTracking } from "@/components/matches/details/contact-tracking";
import { DetailsModals } from "@/components/matches/details/details-modals";

export default function MatchDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profileComplete, isAdmin, blockUser } = useUser();
  const { isAuthenticated } = useAuth();
  const { openGateway } = useWelcomeGateway();
  const isMasked = !isAuthenticated || !profileComplete;

  const {
    match,
    isLoading,
    isError,
    contactMatch,
    deleteMatch,
    adminDeleteMatch,
    cancelMatchContact,
    updateRequestStatus,
    closeRegistrations,
  } = useMatch(id || null);

  const { participations, markAsRead } = useMyParticipations();

  // Highlight & Alert Logic
  const {
    highlights,
    showPulse,
    isMarkingRead,
    handleMarkAsRead,
    isModified,
    hasHighlights,
    gender,
    cleanNotes,
  } = useMatchHighlights({
    matchId: id,
    match,
    participations,
    userId: user?.id,
    markAsRead,
  });

  // Modal Disclosures
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onOpenChange: onDeleteOpenChange,
  } = useDisclosure();
  const {
    isOpen: isCancelOpen,
    onOpen: onCancelOpen,
    onOpenChange: onCancelOpenChange,
  } = useDisclosure();
  const {
    isOpen: isAdminDeleteOpen,
    onOpen: onAdminDeleteOpen,
    onOpenChange: onAdminDeleteOpenChange,
  } = useDisclosure();
  const {
    isOpen: isBlockOpen,
    onOpen: onBlockOpen,
    onOpenChange: onBlockOpenChange,
  } = useDisclosure();
  const {
    isOpen: isCloseRegOpen,
    onOpen: onCloseRegOpen,
    onOpenChange: onCloseRegOpenChange,
  } = useDisclosure();
  const {
    isOpen: isCancelAcceptedOpen,
    onOpen: onCancelAcceptedOpen,
    onOpenChange: onCancelAcceptedOpenChange,
  } = useDisclosure();

  // Action States
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isAdminDeleting, setIsAdminDeleting] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isLoadingCancelAccepted, setIsLoadingCancelAccepted] = useState(false);
  const [blockReason, setBlockReason] = useState(
    t("details.admin.block_reason_default", "Suspension administrative"),
  );

  if (isLoading) {
    return (
      <DefaultLayout>
        <MatchDetailsSkeleton />
      </DefaultLayout>
    );
  }

  if (isError || !match) {
    return (
      <DefaultLayout>
        <div className="flex flex-col items-center justify-center gap-4 h-[50vh]">
          <h1 className="text-2xl font-bold text-danger">
            {t("error.not_found")}
          </h1>
          <Button as={Link} color="primary" to="/matches">
            {t("back_to_list")}
          </Button>
        </div>
      </DefaultLayout>
    );
  }

  // Action Handlers
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMatch();
      addToast({
        title: t("dashboard.toasts.delete_success", {
          matchType: t("enums.type." + match.type).toLowerCase(),
        }),
        description: t("dashboard.toasts.delete_success_desc"),
        color: "success",
      });
      navigate("/matches");
    } catch (error) {
      addToast({
        title: t("error.title"),
        description: t("error.delete_failed"),
        color: "danger",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!user) return;
    setIsCancelling(true);
    try {
      await cancelMatchContact(user.id);
      onCancelOpenChange();
    } catch (error) {
      addToast({
        title: t("error.title"),
        description: t("match.cancel_error"),
        color: "danger",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleAdminDelete = async () => {
    setIsAdminDeleting(true);
    try {
      await adminDeleteMatch();
      addToast({
        title: t("match.delete_success_admin", {
          matchType: t("enums.type." + (match.type || "match")),
        }),
        color: "success",
      });
      navigate("/matches");
    } catch (error) {
      addToast({
        title: t("error.title"),
        description: t("match.admin_delete_error"),
        color: "danger",
      });
    } finally {
      setIsAdminDeleting(false);
    }
  };

  const handleBlockUser = async () => {
    if (!match.owner_id) return;
    setIsBlocking(true);
    try {
      await blockUser(match.owner_id, true, blockReason);
      addToast({
        title: t("success"),
        description: t("match.block_success"),
        color: "success",
      });
    } catch (error) {
      addToast({
        title: t("error.title"),
        description: t("match.block_error"),
        color: "danger",
      });
    } finally {
      setIsBlocking(false);
    }
  };

  const handleCloseRegistrations = async () => {
    try {
      await closeRegistrations();
      addToast({
        title: t("success"),
        description: t("details.modal.closed_success"),
        color: "success",
      });
    } catch {
      addToast({
        title: t("error.title"),
        description: t("error.action_impossible"),
        color: "danger",
      });
    }
  };

  const handleCancelAccepted = async () => {
    setIsLoadingCancelAccepted(true);
    try {
      const acceptedContact = match.contacts?.find(
        (c: any) => c.status === "accepted",
      );

      if (acceptedContact) {
        await updateRequestStatus(acceptedContact.user_id, "refused");
      }
      addToast({
        title: t("success"),
        description: t("match.cancel_success"),
        color: "success",
      });
    } catch {
      addToast({
        title: t("error.title"),
        description: t("error.generic"),
        color: "danger",
      });
    } finally {
      setIsLoadingCancelAccepted(false);
    }
  };

  const matchJsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${match.club?.name || "Match"} vs Participation`,
    description: match.notes || t("site_description"),
    startDate: `${match.match_date}T${match.match_time}:00`,
    location: {
      "@type": "Place",
      name: match.location_city,
      address: {
        "@type": "PostalAddress",
        addressLocality: match.location_city,
        addressCountry: "FR",
      },
    },
    organizer: {
      "@type": "Organization",
      name: match.club?.name,
      logo: match.club?.logo_url,
    },
  };

  return (
    <DefaultLayout>
      <SEO
        canonical={`https://kdufoot.com/matches/${id}`}
        description={`${match.club?.name} cherche un adversaire pour un ${t("enums.type." + match.type).toLowerCase()} le ${match.match_date} à ${match.location_city}.`}
        jsonLd={matchJsonLd}
        title={`${match.club?.name} - ${t("enums.type." + match.type)}`}
      />
      <DataWall>
        <div className="container mx-auto max-w-7xl px-2 sm:px-6 py-8 space-y-8 animate-appearance-in pb-24">
          {/* Top Navigation */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <Button
              className="font-medium"
              startContent={
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
              variant="light"
              onPress={() =>
                window.history.length > 2 ? navigate(-1) : navigate("/matches")
              }
            >
              {t("back")}
            </Button>

            {user?.id === match.owner_id && (
              <div className="flex gap-2">
                <Button
                  as={Link}
                  color="primary"
                  to={`/matches/${id}/edit`}
                  variant="flat"
                >
                  {t("base.edit", "Mettre à jour")}
                </Button>
                <Button color="danger" variant="flat" onPress={onDeleteOpen}>
                  {t("delete")}
                </Button>
              </div>
            )}

            {isAdmin && user?.id !== match.owner_id && (
              <div className="flex flex-col sm:flex-row gap-2 bg-danger/5 p-2 rounded-2xl border border-danger/20 animate-pulse w-full sm:w-auto">
                <span className="text-xs sm:text-sm font-bold text-danger px-2 py-1">
                  {t("details.admin.moderation_tools")}
                </span>
                <div className="flex gap-2 p-2">
                  <Button
                    color="default"
                    variant="solid"
                    onPress={onAdminDeleteOpen}
                  >
                    {t("details.buttons.delete_ad")}
                  </Button>
                  <Button
                    color="danger"
                    isLoading={isBlocking}
                    variant="solid"
                    onPress={onBlockOpen}
                  >
                    {t("details.buttons.block_user")}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <MatchHeader isMasked={isMasked} match={match} />
              <InfoGrid
                gender={gender}
                highlights={highlights}
                match={match}
                showPulse={showPulse}
              />
              <ModificationBanner
                handleMarkAsRead={handleMarkAsRead}
                hasHighlights={hasHighlights}
                isMarkingRead={isMarkingRead}
                isModified={isModified}
              />
              <AdditionalInfo match={match} />
              <MatchNotes cleanNotes={cleanNotes} />
            </div>

            <div className="flex flex-col gap-4">
              <ParticipationSection
                contactMatch={contactMatch}
                handleMarkAsRead={handleMarkAsRead}
                id={id}
                isMarkingRead={isMarkingRead}
                isMasked={isMasked}
                isModified={isModified}
                match={match}
                openGateway={openGateway}
                profileComplete={profileComplete}
                user={user}
                onCancelAcceptedOpen={onCancelAcceptedOpen}
                onCancelOpen={onCancelOpen}
                onCloseRegOpen={onCloseRegOpen}
              />
            </div>

            <ContactTracking match={match} user={user} />
          </div>

          <DetailsModals
            blockReason={blockReason}
            handleAdminDelete={handleAdminDelete}
            handleBlockUser={handleBlockUser}
            handleCancelAccepted={handleCancelAccepted}
            handleCancelRequest={handleCancelRequest}
            handleCloseRegistrations={handleCloseRegistrations}
            handleDelete={handleDelete}
            isAdminDeleteOpen={isAdminDeleteOpen}
            isAdminDeleting={isAdminDeleting}
            isBlockOpen={isBlockOpen}
            isBlocking={isBlocking}
            isCancelAcceptedOpen={isCancelAcceptedOpen}
            isCancelOpen={isCancelOpen}
            isCancelling={isCancelling}
            isCloseRegOpen={isCloseRegOpen}
            isDeleteOpen={isDeleteOpen}
            isDeleting={isDeleting}
            isLoadingCancelAccepted={isLoadingCancelAccepted}
            match={match}
            setBlockReason={setBlockReason}
            onAdminDeleteOpenChange={onAdminDeleteOpenChange}
            onBlockOpenChange={onBlockOpenChange}
            onCancelAcceptedOpenChange={onCancelAcceptedOpenChange}
            onCancelOpenChange={onCancelOpenChange}
            onCloseRegOpenChange={onCloseRegOpenChange}
            onDeleteOpenChange={onDeleteOpenChange}
          />
        </div>
      </DataWall>
    </DefaultLayout>
  );
}
