import { TFunction } from "i18next";
import { Permission } from "@/types/permissions";

export const getKdufootPermissions = (t: TFunction) => {
  return Object.values(Permission).map((val) => {
    const value = val as string;
    const key = value.replace(/:/g, "_");
    const group = value.split(":")[0];

    let label = t(`permission.${key}`);
    let groupLabel = t(`permission.group.${group}`);

    return {
      key,
      label,
      value,
      group,
      groupLabel,
    };
  });
};

export const groupColor = (
  group: string,
): "primary" | "secondary" | "success" | "warning" | "danger" | "default" => {
  const map: Record<
    string,
    "primary" | "secondary" | "success" | "warning" | "danger" | "default"
  > = {
    read: "primary",
    write: "primary",
    exercises: "secondary",
    videos: "warning",
    sessions: "success",
    matches: "danger",
    export: "default",
    share: "default",
    admin: "danger",
    auth0: "danger",
    coach: "success",
    role: "danger",
  };

  return map[group] ?? "default";
};

export const SUPER_ADMIN_EMAIL = "yannidelattrebalcer.artois@gmail.com";
export const SUPREME_MASTER_ID = "6f62d717-2136-49d7-8c51-fee07eaeebce";
