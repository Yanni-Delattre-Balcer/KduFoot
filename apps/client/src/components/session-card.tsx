import React from "react";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { TrainingSession } from "@/types/session.types";

interface SessionCardProps {
  session: TrainingSession;
  i18n: { language: string };
}

export const SessionCard = React.memo(function SessionCard({
  session,
  i18n,
}: SessionCardProps) {
  const { t } = useTranslation();

  return (
    <Card
      key={session.id}
      className="group hover:shadow-lg hover:shadow-green-500/10 transition-all bg-[#18251e] border border-green-500/20 hover:border-green-500/40"
    >
      <CardHeader className="pb-0 pt-4 px-4 flex-col items-start">
        <div className="flex justify-between w-full">
          <p className="text-tiny font-bold text-green-600">
            {session.category || "Séance"}
          </p>
          <Chip
            className="bg-green-50 text-green-800 dark:bg-green-500/10 dark:text-green-300"
            size="sm"
            variant="flat"
          >
            {session.status}
          </Chip>
        </div>
        <h4 className="font-bold text-large mt-1 truncate group-hover:text-green-600 transition-colors">
          {session.name || t("common:untitled")}
        </h4>
        <small className="text-default-500 flex items-center gap-1 mt-1">
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {session.scheduled_date
            ? new Date(session.scheduled_date).toLocaleDateString(i18n.language)
            : ""}
        </small>
      </CardHeader>
      <CardBody className="overflow-visible py-2">
        <p className="text-sm text-default-600 line-clamp-2">
          {session.category} - {session.level || t("sessions.all_levels")}
        </p>
      </CardBody>
      <CardFooter>
        <Button
          as={Link}
          className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 font-bold w-full"
          size="sm"
          to={`/sessions/${session.id}`}
          variant="flat"
        >
          {t("details")}
        </Button>
      </CardFooter>
    </Card>
  );
});
