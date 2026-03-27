import { useTranslation } from "react-i18next";
import { MatchCard } from "@/components/matches/match-card";
import { MatchListSkeleton } from "@/components/skeletons/match-skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorView } from "@/components/common/error-views";
import { Match } from "@/types/match.types";
import { User } from "@/types/user.types";

interface ResultsListProps {
  isLoading: boolean;
  isError: any;
  filteredMatches: Match[];
  type: "match" | "tournament";
  isAdmin: boolean;
  isFavorite: (id: string) => boolean;
  toggleFavorite: (id: string) => void;
  isMasked: boolean;
  user: User | null;
  getDiff: (match: Match) => Record<string, boolean>;
  handleAcceptChanges: (match: Match) => void;
  adminDeleteMatch: (id: string) => Promise<void>;
  setView: (v: "find" | "create") => void;
  globalMutate: any;
}

export const ResultsList = ({
  isLoading,
  isError,
  filteredMatches,
  type,
  isAdmin,
  isFavorite,
  toggleFavorite,
  isMasked,
  user,
  getDiff,
  handleAcceptChanges,
  adminDeleteMatch,
  setView,
  globalMutate,
}: ResultsListProps) => {
  const { t, i18n } = useTranslation();

  return (
    <div className="flex flex-col gap-4">
      {isError && (
        <ErrorView
          message={isError.message}
          status={isError.status || 500}
          onRetry={() =>
            globalMutate(
              (key: unknown) =>
                typeof key === "string" && key.includes("/api/matches"),
            )
          }
        />
      )}

      {!isLoading && filteredMatches.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
          <span className="text-sm font-bold text-white tracking-wider">
            {filteredMatches.length}{" "}
            {type === "tournament"
              ? t("matchesPage.found_tournament")
              : t("matchesPage.found")}
          </span>
        </div>
      )}

      {isLoading && filteredMatches.length === 0 && <MatchListSkeleton />}

      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        id="results-list"
      >
        {filteredMatches.map((match) => {
          const diff = getDiff(match);
          const hasChanges = Object.keys(diff).length > 0;

          return (
            <MatchCard
              key={match.id}
              diff={diff}
              hasChanges={hasChanges}
              i18n={i18n}
              isAdmin={isAdmin}
              isFavorite={isFavorite}
              isMasked={isMasked}
              match={match}
              user={user || undefined}
              onAcceptChanges={handleAcceptChanges}
              onDelete={adminDeleteMatch}
              onToggleFavorite={toggleFavorite}
            />
          );
        })}
      </div>

      {!isLoading && filteredMatches.length === 0 && !isError && (
        <EmptyState
          actionLabel={
            type === "tournament"
              ? t("match.create_tournament")
              : t("match.create")
          }
          description={
            type === "tournament"
              ? t("matchesPage.empty_desc_tournament")
              : t("matchesPage.empty_desc")
          }
          title={
            type === "tournament"
              ? t("matchesPage.empty_title_tournament")
              : t("matchesPage.empty_title")
          }
          onAction={() => setView("create")}
        />
      )}
    </div>
  );
};
