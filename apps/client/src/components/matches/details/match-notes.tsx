import { useTranslation } from "react-i18next";

interface MatchNotesProps {
  cleanNotes: string | undefined;
}

export const MatchNotes = ({ cleanNotes }: MatchNotesProps) => {
  const { t } = useTranslation();

  if (!cleanNotes) return null;

  return (
    <div className="bg-linear-to-br from-amber-500/10 to-orange-500/5 rounded-3xl p-8 border border-amber-500/20">
      <h3 className="font-black text-xl text-amber-500 tracking-tighter mb-4 flex items-center gap-3">
        <span className="text-2xl">📝</span>{" "}
        {t("matchForm.labels.notes", "Notes & Instructions")}
      </h3>
      <div className="text-default-400 font-medium leading-relaxed italic text-lg opacity-80 border-l-2 border-amber-500/30 pl-6">
        {cleanNotes}
      </div>
    </div>
  );
};
