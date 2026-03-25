import React from "react";
import { Card, CardBody, CardFooter } from "@heroui/card";
import { Button } from "@heroui/button";
import { Chip } from "@heroui/chip";
import { Image as HeroImage } from "@heroui/image";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Exercise } from "@/types/exercise.types";

interface ExerciseCardProps {
  exercise: Exercise;
  isInTraining: (id: string) => boolean;
  addExercise: (exercise: Exercise) => void;
  removeExercise: (id: string) => void;
}

export const ExerciseCard = React.memo(function ExerciseCard({
  exercise,
  isInTraining,
  addExercise,
  removeExercise,
}: ExerciseCardProps) {
  const { t } = useTranslation();
  const alreadyInTraining = isInTraining(exercise.id);

  return (
    <Card
      key={exercise.id}
      className="group hover:shadow-lg hover:shadow-amber-500/10 transition-all bg-[#202124] border border-amber-500/20 hover:border-amber-500/40"
    >
      <div className="flex flex-col items-center pt-5 px-4 gap-4">
        {/* 1. Icon/Thumbnail (Top) */}
        <div className="w-full h-40 bg-linear-to-br from-default-50 to-default-100 rounded-xl flex items-center justify-center overflow-hidden">
          {exercise.thumbnail_url ? (
            <HeroImage
              alt={exercise.title}
              className="object-cover rounded-xl w-full h-full"
              src={exercise.thumbnail_url}
              width={270}
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <svg
                className="w-10 h-10 text-default-200"
                fill="none"
                stroke="currentColor"
                strokeWidth={1}
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-default-400 text-xs">
                {t("exercises.noImage")}
              </span>
            </div>
          )}
        </div>

        {/* 2. Title & Category (Below icon, centered) */}
        <div className="flex flex-col items-center text-center gap-1 w-full">
          <Chip
            className="font-bold text-[10px] tracking-wider"
            color="warning"
            size="sm"
            variant="flat"
          >
            {t(`enums.category.${exercise.category}`)}
          </Chip>
          <h4 className="font-bold text-lg group-hover:text-amber-500 transition-colors line-clamp-1">
            {exercise.title}
          </h4>
          <small className="text-default-400 font-medium truncate w-full">
            {exercise.themes}
          </small>
        </div>
      </div>

      {/* 3. Description (Bottom) */}
      <CardBody className="overflow-hidden py-3 text-center">
        <p className="text-sm text-default-500 line-clamp-2 italic leading-relaxed">
          {exercise.synopsis ||
            t("exercises.noSynopsis", "Aucune description disponible")}
        </p>
      </CardBody>

      <CardFooter className="gap-2 px-4 pb-4">
        <Button
          as={Link}
          className="flex-1 font-bold"
          size="sm"
          to={`/exercises/${exercise.id}`}
          variant="flat"
        >
          {t("details")}
        </Button>
        <Button
          isIconOnly
          aria-label={
            alreadyInTraining ? t("training.remove") : t("training.add")
          }
          className="font-bold text-lg shadow-sm text-white"
          color={alreadyInTraining ? "danger" : "warning"}
          size="sm"
          variant={alreadyInTraining ? "flat" : "solid"}
          onPress={() =>
            alreadyInTraining
              ? removeExercise(exercise.id)
              : addExercise(exercise)
          }
        >
          {alreadyInTraining ? "−" : "+"}
        </Button>
      </CardFooter>
    </Card>
  );
});
