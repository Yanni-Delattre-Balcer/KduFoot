/**
 * @copyright Copyright (c) 2024-2026 Ronan LE MEILLAT (base) / KduFoot adaptation
 * @license AGPL-3.0-or-later
 *
 * Page d'administration : gestion des utilisateurs Auth0 et de leurs permissions KduFoot.
 * Accès réservé aux utilisateurs ayant la permission `auth0:admin:api`.
 *
 * Fonctionnement :
 *  1. Au chargement, appel POST /api/__auth0/token (via le worker) pour obtenir le token Management API
 *     → le token est mis en cache côté worker dans le KV Store (limite les appels Auth0)
 *  2. Le token Management est utilisé côté client pour appeler directement Auth0 Management API
 *     → lister les utilisateurs, leurs permissions, ajouter/supprimer des permissions
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import {
    Table,
    TableHeader,
    TableColumn,
    TableBody,
    TableRow,
    TableCell,
} from "@heroui/table";
import { Chip } from "@heroui/chip";
import { addToast } from "@heroui/toast";
import { useAuth0 } from "@auth0/auth0-react";

import DefaultLayout from "@/layouts/default";
import { useSecuredApi } from "@/authentication";
import type {
    Auth0ManagementTokenResponse,
    Auth0User,
    Auth0Permission,
} from "@/types/auth0.types";
import { Permission } from "@/types/permissions";

// ─── Permissions KduFoot à gérer dans l'interface (Généré dynamiquement) ─────
const getKdufootPermissions = (t: any) => {
    return Object.values(Permission).map((val) => {
        const value = val as string;
        const key = value.replace(/:/g, "_");
        const group = value.split(":")[0];
        return {
            key,
            label: t(`permission.${key}`),
            value,
            group,
            groupLabel: t(`permission.group.${group}`),
        };
    });
};

// ─── Couleur d'un groupe ───────────────────────────────────────────────────
const groupColor = (group: string): "primary" | "secondary" | "success" | "warning" | "danger" | "default" => {
    const map: Record<string, "primary" | "secondary" | "success" | "warning" | "danger" | "default"> = {
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
    };
    return map[group] ?? "default";
};

export default function UsersAndPermissionsPage() {
    const { user: currentUser } = useAuth0();
    const currentUserId = (currentUser?.sub ?? "").toString().trim();
    const { t } = useTranslation();
    const KDUFOOT_PERMISSIONS = getKdufootPermissions(t);

    const {
        getAuth0ManagementToken,
        listAuth0Users,
        getUserPermissions,
        addPermissionToUser,
        removePermissionFromUser,
        deleteAuth0User,
    } = useSecuredApi();

    const [mgmtToken, setMgmtToken] = useState<string | null>(null);
    const [tokenFromCache, setTokenFromCache] = useState<boolean>(false);
    const [users, setUsers] = useState<Auth0User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    // { userId: { permKey: boolean } } — état d'édition des permissions
    const [editing, setEditing] = useState<Record<string, Record<string, boolean>>>({});
    // userId dont la modale de détail est ouverte
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [savingUserId, setSavingUserId] = useState<string | null>(null);

    // ─── 1. Chargement du token Management API ──────────────────────────────
    useEffect(() => {
        getAuth0ManagementToken()
            .then(async (resp) => {
                if ("access_token" in resp) {
                    const tokenResp = resp as Auth0ManagementTokenResponse;
                    setMgmtToken(tokenResp.access_token);
                    setTokenFromCache(tokenResp.from_cache ?? false);
                    // Charger la liste des utilisateurs
                    try {
                        const u = await listAuth0Users(tokenResp.access_token);
                        setUsers(u ?? []);
                    } catch (err) {
                        console.error("Erreur chargement utilisateurs:", err);
                        addToast({ title: t("error"), description: t("error-fetching-data"), variant: "solid" });
                    }
                } else {
                    addToast({ title: t("error"), description: t("no-management-token"), variant: "solid" });
                }
            })
            .catch((err) => {
                console.error("Erreur token Management:", err);
                addToast({ title: t("error"), description: t("no-management-token"), variant: "solid" });
            })
            .finally(() => setLoadingUsers(false));
    }, []);

    // ─── 2. Ouverture du panneau d'édition d'un utilisateur ─────────────────
    const openUserEditing = async (userId: string) => {
        if (!mgmtToken) return;
        setSelectedUserId(userId);
        setModalLoading(true);
        try {
            const perms: Auth0Permission[] = await getUserPermissions(mgmtToken, userId);
            const audience = (import.meta as any)?.env?.AUTH0_AUDIENCE ?? "";
            const permNames = perms
                .filter((p) => {
                    if (!audience) return true;
                    const rs = p.resource_server_identifier ?? "";
                    return rs === audience || rs.includes(audience) || audience.includes(rs);
                })
                .map((p) => p.permission_name);

            const permState: Record<string, boolean> = {};
            for (const perm of KDUFOOT_PERMISSIONS) {
                permState[perm.key] = permNames.includes(perm.value);
            }
            setEditing((prev) => ({ ...prev, [userId]: permState }));
        } catch (err) {
            console.error("Erreur chargement permissions:", err);
            addToast({ title: t("error"), description: t("failed-loading-user-permissions"), variant: "solid" });
        } finally {
            setModalLoading(false);
        }
    };

    // ─── 3. Bascule d'une permission ────────────────────────────────────────
    const togglePermission = (userId: string, permKey: string) => {
        setEditing((prev) => ({
            ...prev,
            [userId]: {
                ...(prev[userId] ?? {}),
                [permKey]: !(prev[userId]?.[permKey] ?? false),
            },
        }));
    };

    // ─── 4. Sauvegarde des permissions ──────────────────────────────────────
    const savePermissions = async (userId: string) => {
        if (!mgmtToken) return;
        setSavingUserId(userId);
        try {
            const edits = editing[userId] ?? {};
            const currentPerms: Auth0Permission[] = await getUserPermissions(mgmtToken, userId);
            const audience = (import.meta as any)?.env?.AUTH0_AUDIENCE ?? "";
            const currentNames = currentPerms
                .filter((p) => {
                    const rs = p.resource_server_identifier ?? "";
                    return !audience || rs === audience || rs.includes(audience) || audience.includes(rs);
                })
                .map((p) => p.permission_name);

            for (const perm of KDUFOOT_PERMISSIONS) {
                if (!Object.prototype.hasOwnProperty.call(edits, perm.key)) continue;
                const shouldHave = edits[perm.key];
                const hasIt = currentNames.includes(perm.value);
                if (shouldHave && !hasIt) {
                    await addPermissionToUser(mgmtToken, userId, perm.value);
                } else if (!shouldHave && hasIt) {
                    await removePermissionFromUser(mgmtToken, userId, perm.value);
                }
            }

            addToast({ title: t("success"), description: t("user-updated-successfully"), variant: "solid", timeout: 4000 });
            setEditing((prev) => ({ ...prev, [userId]: {} }));
            setSelectedUserId(null);
        } catch (err) {
            console.error(err);
            addToast({ title: t("error"), description: t("error-updating-user"), variant: "solid" });
        } finally {
            setSavingUserId(null);
        }
    };

    // ─── 5. Suppression d'un utilisateur ────────────────────────────────────
    const deleteUser = async (userId: string) => {
        if (!mgmtToken) return;
        if (userId === currentUserId) {
            addToast({ title: t("error"), description: t("cannot-delete-self"), variant: "solid" });
            return;
        }
        if (!window.confirm(`Supprimer l'utilisateur ${userId} ?`)) return;
        try {
            await deleteAuth0User(mgmtToken, userId);
            setUsers((prev) => prev.filter((u) => u.user_id !== userId));
            if (selectedUserId === userId) setSelectedUserId(null);
            addToast({ title: t("success"), description: t("user-deleted"), variant: "solid" });
        } catch (err) {
            console.error(err);
            addToast({ title: t("error"), description: t("error-deleting-user"), variant: "solid" });
        }
    };

    // ─── Rendu ──────────────────────────────────────────────────────────────
    return (
        <DefaultLayout>
            <section className="flex flex-col gap-6 py-8 md:py-10 px-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Gestion des utilisateurs et permissions</h1>
                        <p className="text-default-500 text-sm mt-1">
                            Gérez les accès des utilisateurs KduFoot.
                            {tokenFromCache && (
                                <span className="ml-2 text-success-600 text-xs">(token Management en cache ✓)</span>
                            )}
                        </p>
                    </div>
                </div>

                {/* Table des utilisateurs */}
                {loadingUsers ? (
                    <p className="text-default-500">Chargement des utilisateurs…</p>
                ) : (
                    <Table aria-label="Utilisateurs Auth0" selectionMode="none">
                        <TableHeader>
                            <TableColumn>Utilisateur</TableColumn>
                            <TableColumn>Email</TableColumn>
                            <TableColumn>Abonnement</TableColumn>
                            <TableColumn>Connexions</TableColumn>
                            <TableColumn>Actions</TableColumn>
                        </TableHeader>
                        <TableBody emptyContent="Aucun utilisateur trouvé">
                            {users.map((u) => (
                                <TableRow key={u.user_id}>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {u.picture && (
                                                <img
                                                    src={u.picture}
                                                    alt={u.name}
                                                    className="w-8 h-8 rounded-full"
                                                />
                                            )}
                                            <div>
                                                <p className="font-medium text-sm">{u.name || u.nickname}</p>
                                                <p className="text-xs text-default-400">{u.user_id}</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm">{u.email}</span>
                                            {u.email_verified && (
                                                <span className="text-success-500 text-xs">✓</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {u.app_metadata?.subscription ? (
                                            <Chip
                                                size="sm"
                                                color={
                                                    u.app_metadata.subscription === "Ultime"
                                                        ? "warning"
                                                        : u.app_metadata.subscription === "Pro"
                                                            ? "primary"
                                                            : "default"
                                                }
                                                variant="flat"
                                            >
                                                {u.app_metadata.subscription}
                                            </Chip>
                                        ) : (
                                            <Chip size="sm" color="default" variant="flat">Free</Chip>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm">{u.logins_count ?? 0}</span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="flat"
                                                color="primary"
                                                onPress={() => openUserEditing(u.user_id)}
                                                isDisabled={!mgmtToken}
                                            >
                                                Permissions
                                            </Button>
                                            {u.user_id !== currentUserId && (
                                                <Button
                                                    size="sm"
                                                    variant="flat"
                                                    color="danger"
                                                    onPress={() => deleteUser(u.user_id)}
                                                    isDisabled={!mgmtToken}
                                                >
                                                    Supprimer
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                {/* Panneau d'édition des permissions */}
                {selectedUserId && (
                    <div className="mt-6 p-6 border border-default-200 rounded-xl bg-default-50">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">
                                Permissions de{" "}
                                <span className="text-primary">
                                    {users.find((u) => u.user_id === selectedUserId)?.name ?? selectedUserId}
                                </span>
                            </h2>
                            <Button
                                size="sm"
                                variant="light"
                                onPress={() => { setSelectedUserId(null); setEditing((prev) => ({ ...prev, [selectedUserId]: {} })); }}
                            >
                                Fermer
                            </Button>
                        </div>

                        {modalLoading ? (
                            <p className="text-default-500">Chargement des permissions…</p>
                        ) : (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
                                    {(() => {
                                        // Regrouper par catégorie
                                        const groups: Record<string, { label: string; perms: typeof KDUFOOT_PERMISSIONS }> = {};
                                        for (const perm of KDUFOOT_PERMISSIONS) {
                                            if (!groups[perm.group]) {
                                                groups[perm.group] = {
                                                    label: perm.groupLabel,
                                                    perms: [],
                                                };
                                            }
                                            groups[perm.group].perms.push(perm);
                                        }
                                        return Object.entries(groups).map(([groupKey, group]) => (
                                            <div key={groupKey} className="bg-default-100 rounded-lg p-3">
                                                <Chip size="sm" color={groupColor(groupKey)} variant="flat" className="mb-2">
                                                    {group.label}
                                                </Chip>
                                                <div className="flex flex-col gap-1.5">
                                                    {group.perms.map((perm) => (
                                                        <Checkbox
                                                            key={perm.key}
                                                            isSelected={editing[selectedUserId]?.[perm.key] ?? false}
                                                            onValueChange={() => togglePermission(selectedUserId, perm.key)}
                                                            size="sm"
                                                            isDisabled={
                                                                // Empêcher de retirer sa propre permission auth0:admin:api
                                                                selectedUserId === currentUserId && perm.value === "auth0:admin:api"
                                                            }
                                                        >
                                                            <span className="text-xs">{perm.label}</span>
                                                        </Checkbox>
                                                    ))}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        color="primary"
                                        onPress={() => savePermissions(selectedUserId)}
                                        isLoading={savingUserId === selectedUserId}
                                        isDisabled={Object.keys(editing[selectedUserId] ?? {}).length === 0}
                                    >
                                        Enregistrer les permissions
                                    </Button>
                                    <Button
                                        variant="flat"
                                        onPress={() => { setSelectedUserId(null); setEditing((prev) => ({ ...prev, [selectedUserId]: {} })); }}
                                    >
                                        Annuler
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </section>
        </DefaultLayout>
    );
}
