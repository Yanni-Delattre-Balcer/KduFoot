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
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Chip } from "@heroui/chip";
import { addToast } from "@heroui/toast";
import { useAuth0 } from "@auth0/auth0-react";
import { Input } from "@heroui/input";

import DefaultLayout from "@/layouts/default";
import { useSecuredApi } from "@/authentication";
import { useUser } from "@/hooks/use-user";
import type {
    Auth0ManagementTokenResponse,
    Auth0User,
    Auth0Permission,
} from "@/types/auth0.types";
import { Permission } from "@/types/permissions";

const SUPER_ADMIN_EMAIL = 'yannidelattrebalcer.artois@gmail.com';

// ─── Permissions KduFoot à gérer dans l'interface (Généré dynamiquement) ─────
const getKdufootPermissions = (t: any) => {
    return Object.values(Permission).map((val) => {
        const value = val as string;
        const key = value.replace(/:/g, "_");
        const group = value.split(":")[0];

        let label = t(`permission.${key}`);
        let groupLabel = t(`permission.group.${group}`);

        if (value === 'role:blocked') {
            label = "Bloquer l'accès complet";
            groupLabel = "Sanction Admin";
        }

        return {
            key,
            label,
            value,
            group,
            groupLabel,
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
        role: "danger",
    };
    return map[group] ?? "default";
};

type RoleFilter = 'all' | 'subscribers' | 'admins' | 'blocked';

export default function UsersAndPermissionsPage() {
    const { user: currentUser, getAccessTokenSilently } = useAuth0();
    const currentUserId = (currentUser?.sub ?? "").toString().trim();
    const { t } = useTranslation();
    const { blockUser } = useUser();
    const KDUFOOT_PERMISSIONS = getKdufootPermissions(t);

    const {
        getAuth0ManagementToken,
        listAuth0Users,
        getUserPermissions,
        addPermissionsToUser,
        removePermissionsFromUser,
        deleteAuth0User,
        checkResourceServerScopesWithAudience,
        updateResourceServerScopesWithAudience,
        getD1BlockedUsers,
    } = useSecuredApi();

    const [mgmtToken, setMgmtToken] = useState<string | null>(null);
    const [tokenFromCache, setTokenFromCache] = useState<boolean>(false);
    const [users, setUsers] = useState<Auth0User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');

    // { userId: { permKey: boolean } } — état d'édition des permissions
    const [editing, setEditing] = useState<Record<string, Record<string, boolean>>>({});
    // userId dont la modale de détail est ouverte
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [savingUserId, setSavingUserId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isUpToDate, setIsUpToDate] = useState<boolean | null>(null);

    const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
    const [blockReason, setBlockReason] = useState("");

    // SIRET UI states
    const [siretData, setSiretData] = useState<{
        primary_siret: string | null,
        primary_name?: string | null,
        additional_sirets: { siret: string, name: string }[],
        block_count?: number,
        siret_change_count?: number
    } | null>(null);
    const [newSiret, setNewSiret] = useState("");
    const [forceSiret, setForceSiret] = useState(false);
    const [siretLoading, setSiretLoading] = useState(false);
    const [adminStadiumAddress, setAdminStadiumAddress] = useState("");
    const [adminBlockCount, setAdminBlockCount] = useState<number>(0);
    const [adminSiretChangeCount, setAdminSiretChangeCount] = useState<number>(0);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    const formatSiret = (value: string) => {
        let raw = value.replace(/\D/g, '');
        if (raw.length > 14) raw = raw.substring(0, 14);

        // Format: XXX XXX XXX XXXXX
        let formatted = '';
        for (let i = 0; i < raw.length; i++) {
            if (i === 3 || i === 6 || i === 9) formatted += ' ';
            formatted += raw[i];
        }
        return formatted;
    };

    /**
     * Helper to verify if Auth0 Resource Server scopes are synchronized with the local Permission enum.
     */
    const checkSyncStatus = async (token: string) => {
        try {
            const audience = import.meta.env.AUTH0_AUDIENCE;
            const targetScopes = Object.values(Permission).map((val) => {
                const value = val as string;
                const key = value.replace(/:/g, "_");
                return {
                    value,
                    description: t(`permission.${key}`)
                };
            });
            const upToDate = await checkResourceServerScopesWithAudience(token, audience, targetScopes);
            setIsUpToDate(upToDate);
        } catch (err) {
            console.error("Error checking sync status:", err);
            setIsUpToDate(false); // Default to false on error to allow manual sync
        }
    };

    // ─── 1. Chargement du token Management API ──────────────────────────────
    useEffect(() => {
        getAuth0ManagementToken()
            .then(async (resp) => {
                if ("access_token" in resp) {
                    const tokenResp = resp as Auth0ManagementTokenResponse;
                    setMgmtToken(tokenResp.access_token);
                    setTokenFromCache(tokenResp.from_cache ?? false);

                    // Trigger sync check
                    checkSyncStatus(tokenResp.access_token);

                    // Charger la liste des utilisateurs de Auth0 et la fusionner avec la D1
                    try {
                        const [u, blockedIds] = await Promise.all([
                            listAuth0Users(tokenResp.access_token),
                            getD1BlockedUsers()
                        ]);

                        // Merge the D1 blocked status and Auth0 data
                        const mergedUsers = (u ?? []).map(user => {
                            const blockData = blockedIds.find(b => b.auth0_sub === user.user_id);
                            if (blockData) {
                                return {
                                    ...user,
                                    blocked: true,
                                    block_reason: blockData.block_reason,
                                    app_metadata: {
                                        ...user.app_metadata,
                                        permissions: [
                                            ...(user.app_metadata?.permissions || []),
                                            Permission.ROLE_BLOCKED
                                        ]
                                    }
                                };
                            }
                            return user;
                        });

                        setUsers(mergedUsers);
                    } catch (err) {
                        console.error("Erreur chargement utilisateurs:", err);
                        addToast({ title: t("error.title"), description: t("adminUsersPage.toasts.errorLoadingUsers"), variant: "solid" });
                    }
                } else {
                    addToast({ title: t("error.title"), description: t("adminUsersPage.toasts.noManagementToken"), variant: "solid" });
                }
            })
            .catch((err) => {
                console.error("Erreur token Management:", err);
                addToast({ title: t("error.title"), description: t("adminUsersPage.toasts.noManagementToken"), variant: "solid" });
            })
            .finally(() => setLoadingUsers(false));
    }, []);

    // ─── 2. Ouverture du panneau d'édition d'un utilisateur ─────────────────
    const openUserEditing = async (userId: string) => {
        if (!mgmtToken) return;
        setSelectedUserId(userId);
        setModalLoading(true);
        // Reset SIRET states for the new user
        setSiretData(null);
        setNewSiret("");
        setForceSiret(false);
        loadSirets(userId);
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

            // Force role_blocked based on our D1 truth instead of Auth0
            const userInList = users.find(u => u.user_id === userId);
            permState['role_blocked'] = !!userInList?.blocked;
            setBlockReason(userInList?.block_reason || "");

            setEditing((prev) => ({ ...prev, [userId]: permState }));
        } catch (err) {
            console.error("Erreur chargement permissions:", err);
            addToast({ title: t("error.title"), description: t("adminUsersPage.toasts.errorLoadingPerms"), variant: "solid" });
        } finally {
            setModalLoading(false);
        }
    };

    // ─── 3. Bascule d'une permission ────────────────────────────────────────
    const togglePermission = (userId: string, permKey: string) => {
        // Kill Switch logic: if toggling role_blocked ON, uncheck all others
        if (permKey === 'role_blocked') {
            const currentValue = editing[userId]?.[permKey] ?? false;

            if (!currentValue) {
                // Turning ON blocked: uncheck everything else
                const newPerms: Record<string, boolean> = {};
                KDUFOOT_PERMISSIONS.forEach(p => {
                    newPerms[p.key] = p.key === 'role_blocked';
                });
                setEditing((prev) => ({ ...prev, [userId]: newPerms }));

                return;
            }
        }

        setEditing((prev) => ({
            ...prev,
            [userId]: {
                ...(prev[userId] ?? {}),
                [permKey]: !(prev[userId]?.[permKey] ?? false),
            },
        }));
    };

    // ─── 3b. Attribution rapide d'un rôle ─────────────────────────────────────
    const applyRole = (role: string) => {
        if (!selectedUserId) return;

        // Super-admin protection: reject modifications for the super-admin
        const targetUser = users.find(u => u.user_id === selectedUserId);
        if (targetUser?.email === SUPER_ADMIN_EMAIL && role !== 'superadmin') {
            addToast({ title: "Protection", description: "Impossible de modifier les permissions du Super-Administrateur.", variant: "solid", color: "danger" });
            return;
        }

        let newPerms: Record<string, boolean> = {};
        const currentEdits = editing[selectedUserId] || {};

        // Prevent removing self auth0:admin:api if it evaluates to true
        const preserveAdmin = selectedUserId === currentUserId && currentEdits["auth0_admin_api"];

        KDUFOOT_PERMISSIONS.forEach(p => {
            newPerms[p.key] = false;
        });

        if (preserveAdmin) {
            newPerms["auth0_admin_api"] = true;
        }

        const setPerms = (values: string[]) => {
            values.forEach(v => {
                const p = KDUFOOT_PERMISSIONS.find(k => k.value === v);
                if (p) newPerms[p.key] = true;
            });
        };

        switch (role) {
            case "free":
                setPerms(["read:api", "write:api", "matches:create", "matches:contact"]);
                break;
            case "premium":
                setPerms([
                    "read:api", "write:api", "matches:create", "matches:contact",
                    "exercises:read", "exercises:create", "exercises:update",
                    "videos:analyze", "export:video"
                ]);
                break;
            case "admin":
                setPerms([
                    "read:api", "write:api", "matches:create", "matches:contact",
                    "admin:matches", "sessions:share", "share:library"
                ]);
                break;
            case "superadmin":
                KDUFOOT_PERMISSIONS.forEach(p => {
                    newPerms[p.key] = true;
                });
                // Remove role:blocked from superadmin
                newPerms["role_blocked"] = false;
                break;
            case "blocked":
                // Kill switch: only role:blocked is ON
                KDUFOOT_PERMISSIONS.forEach(p => {
                    newPerms[p.key] = false;
                });
                newPerms["role_blocked"] = true;
                break;
        }

        setEditing(prev => ({ ...prev, [selectedUserId]: newPerms }));
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

            const toAdd: string[] = [];
            const toRemove: string[] = [];

            let handleBlockLogic = false;
            let targetBlockState = false;

            for (const perm of KDUFOOT_PERMISSIONS) {
                if (!Object.prototype.hasOwnProperty.call(edits, perm.key)) continue;
                const shouldHave = edits[perm.key];
                const hasIt = currentNames.includes(perm.value);

                if (perm.key === 'role_blocked') {
                    const userWasBlocked = !!users.find(u => u.user_id === userId)?.blocked;
                    if (shouldHave !== userWasBlocked) {
                        handleBlockLogic = true;
                        targetBlockState = shouldHave;
                    }
                    continue; // Skip adding role:blocked to Auth0
                }

                if (shouldHave && !hasIt) {
                    toAdd.push(perm.value);
                } else if (!shouldHave && hasIt) {
                    toRemove.push(perm.value);
                }
            }

            // Execute D1 Blocking Logic
            if (handleBlockLogic) {
                if (targetBlockState) {
                    await blockUser(userId, true, blockReason || undefined);
                } else {
                    await blockUser(userId, false);
                }
            }

            // Batch execution to avoid Auth0 rate limits
            if (toAdd.length > 0) {
                await addPermissionsToUser(mgmtToken, userId, toAdd);
            }
            if (toRemove.length > 0) {
                await removePermissionsFromUser(mgmtToken, userId, toRemove);
            }

            addToast({ title: t("success"), description: t("adminUsersPage.toasts.successUpdate"), variant: "solid", timeout: 4000 });

            // Optimistic UI update so the table badges instantly reflect the new permissions
            setUsers(prev => prev.map(u => {
                if (u.user_id !== userId) return u;
                const prevPerms = u.app_metadata?.permissions || [];
                let updatedPerms = prevPerms.filter(p => !toRemove.includes(p));
                toAdd.forEach(newP => {
                    if (!updatedPerms.includes(newP)) updatedPerms.push(newP);
                });

                // Handle optimistic UI for block state
                let newBlockedState = u.blocked;
                let newBlockReason = u.block_reason;
                if (handleBlockLogic) {
                    newBlockedState = targetBlockState;
                    newBlockReason = targetBlockState ? blockReason : null;
                    if (targetBlockState && !updatedPerms.includes(Permission.ROLE_BLOCKED)) {
                        updatedPerms.push(Permission.ROLE_BLOCKED);
                    } else if (!targetBlockState) {
                        updatedPerms = updatedPerms.filter(p => p !== Permission.ROLE_BLOCKED);
                    }
                }

                return {
                    ...u,
                    blocked: newBlockedState,
                    block_reason: newBlockReason,
                    app_metadata: {
                        ...u.app_metadata,
                        permissions: updatedPerms
                    }
                };
            }));

            setEditing((prev) => ({ ...prev, [userId]: {} }));
            setSelectedUserId(null);
        } catch (err) {
            console.error(err);
            addToast({ title: t("error.title"), description: t("error-updating-user"), variant: "solid" });
        } finally {
            setSavingUserId(null);
        }
    };

    // ─── 5. Suppression d'un utilisateur ────────────────────────────────────
    const deleteUser = async (userId: string) => {
        if (!mgmtToken) return;
        if (userId === currentUserId) {
            addToast({ title: t("error.title"), description: t("adminUsersPage.toasts.cannotDeleteSelf"), variant: "solid" });
            return;
        }
        // Super-admin protection
        const targetUser = users.find(u => u.user_id === userId);
        if (targetUser?.email === SUPER_ADMIN_EMAIL) {
            addToast({ title: "Protection", description: "Impossible de supprimer le Super-Administrateur.", variant: "solid", color: "danger" });
            return;
        }
        if (!window.confirm(t("adminUsersPage.confirmDeletePrefix", { userId }))) return;
        try {
            await deleteAuth0User(mgmtToken, userId);
            setUsers((prev) => prev.filter((u) => u.user_id !== userId));
            if (selectedUserId === userId) setSelectedUserId(null);
            addToast({ title: t("success"), description: t("adminUsersPage.toasts.successDelete"), variant: "solid" });
        } catch (err) {
            console.error(err);
            addToast({ title: t("error.title"), description: t("adminUsersPage.toasts.errorDelete"), variant: "solid" });
        }
    };

    // ─── 5b. Bloquer/Débloquer un utilisateur (D1) ─────────────────────────
    const handleBlockUser = async (userId: string, email: string | undefined) => {
        // Super-admin protection
        if (email === SUPER_ADMIN_EMAIL) {
            addToast({ title: "Protection", description: "Impossible de bloquer le Super-Administrateur.", variant: "solid", color: "danger" });
            return;
        }

        // Find the user's D1 ID (we need to look it up)
        // The admin.ts route accepts Auth0 user_id and looks it up by ID in the path
        // But our blockUser expects the D1 user ID. Let's use the Auth0 sub to query.
        // Actually, looking at the admin route, it accepts the D1 user id in the path.
        // We don't have the D1 id here. Let's show a prompt for the reason.
        setBlockingUserId(userId);
        setBlockReason("");
    };

    const confirmBlock = async (d1UserId: string) => {
        try {
            await blockUser(d1UserId, true, blockReason);

            if (mgmtToken) {
                const permsToRemove = KDUFOOT_PERMISSIONS
                    .filter(p => p.value !== Permission.ROLE_BLOCKED)
                    .map(p => p.value);

                await removePermissionsFromUser(mgmtToken, d1UserId, permsToRemove).catch(() => { });
            }

            setBlockingUserId(null);
            setBlockReason("");
            addToast({ title: "Utilisateur banni", description: "L'utilisateur et ses matchs ont été supprimés.", color: "danger" });
            // Force update editing state if the pane is open
            const newPerms: Record<string, boolean> = {};
            KDUFOOT_PERMISSIONS.forEach(p => {
                newPerms[p.key] = p.key === 'role_blocked';
            });
            setEditing(prev => ({ ...prev, [d1UserId]: newPerms }));

            // Modification optimiste de l'état local pour rafraîchir le bouton instantanément
            setUsers(prev => prev.map(u => {
                if (u.user_id !== d1UserId) return u;
                return {
                    ...u,
                    blocked: true,
                    block_reason: blockReason || undefined,
                    app_metadata: {
                        ...u.app_metadata,
                        permissions: [Permission.ROLE_BLOCKED]
                    }
                };
            }));

        } catch (err: any) {
            addToast({ title: "Erreur", description: err.message, color: "danger" });
        }
    };

    const loadSirets = async (userId: string) => {
        setSiretLoading(true);
        try {
            const token = await getAccessTokenSilently();
            const res = await fetch(`${import.meta.env.API_BASE_URL || import.meta.env.VITE_API_URL}/api/admin/users/${encodeURIComponent(userId)}/sirets`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSiretData({
                    primary_siret: data.primary_siret,
                    primary_name: data.primary_name,
                    additional_sirets: data.additional_sirets || [],
                    block_count: data.block_count || 0,
                    siret_change_count: data.siret_change_count || 0
                });
                setAdminStadiumAddress(data.stadium_address || "");
                setAdminBlockCount(data.block_count || 0);
                setAdminSiretChangeCount(data.siret_change_count || 0);
            } else {
                setSiretData(null);
            }
        } catch {
            setSiretData(null);
        }
        setSiretLoading(false);
    };

    const handleUpdateUserProfile = async () => {
        if (!selectedUserId) return;
        setIsSavingProfile(true);
        try {
            const token = await getAccessTokenSilently();
            const res = await fetch(`${import.meta.env.API_BASE_URL || import.meta.env.VITE_API_URL}/api/admin/users/${encodeURIComponent(selectedUserId)}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    stadium_address: adminStadiumAddress,
                    block_count: Number(adminBlockCount),
                    siret_change_count: Number(adminSiretChangeCount)
                })
            });
            const data = await res.json();
            if (data.success) {
                addToast({ title: "Succès", description: "Profil administrateur mis à jour sur D1.", color: "success" });
            } else {
                addToast({ title: "Erreur", description: data.error || "Échec de la mise à jour.", color: "danger" });
            }
        } catch (err: any) {
            addToast({ title: "Erreur", description: err.message || "Erreur réseau.", color: "danger" });
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleAddSiret = async () => {
        const cleanSiret = newSiret.replace(/\s/g, '').trim();
        if (!selectedUserId || !cleanSiret || cleanSiret === "") return;
        setSiretLoading(true);
        try {
            const token = await getAccessTokenSilently();
            const res = await fetch(`${import.meta.env.API_BASE_URL || import.meta.env.VITE_API_URL}/api/admin/users/${encodeURIComponent(selectedUserId)}/additional-sirets`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ siret: cleanSiret, force: forceSiret })
            });
            const data = await res.json();
            if (data.success) {
                setSiretData(prev => prev ? { ...prev, additional_sirets: data.additional_sirets } : null);
                setNewSiret("");
                setForceSiret(false);
                addToast({ title: "Succès", description: `SIRET ${forceSiret ? '(forcé) ' : ''}ajouté.`, color: "success" });
            } else {
                addToast({ title: "Erreur", description: data.error || "Échec de l'ajout.", color: "danger" });
            }
        } catch {
            addToast({ title: "Erreur", description: "Erreur réseau.", color: "danger" });
        }
        setSiretLoading(false);
    };

    const handleRemoveSiret = async (siretToRemove: string) => {
        if (!selectedUserId) return;
        setSiretLoading(true);
        try {
            const token = await getAccessTokenSilently();
            const res = await fetch(`${import.meta.env.API_BASE_URL || import.meta.env.VITE_API_URL}/api/admin/users/${encodeURIComponent(selectedUserId)}/additional-sirets/${siretToRemove}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setSiretData(prev => prev ? { ...prev, additional_sirets: data.additional_sirets } : null);
                addToast({ title: "Succès", description: "SIRET détaché.", color: "success" });
            } else {
                addToast({ title: "Erreur", description: data.error || "Échec de la suppression.", color: "danger" });
            }
        } catch {
            addToast({ title: "Erreur", description: "Erreur réseau.", color: "danger" });
        }
        setSiretLoading(false);
    };

    const handleUnblockUser = async (d1UserId: string) => {
        try {
            // 1. Débloquer dans D1
            await blockUser(d1UserId, false);

            // 2. Restaurer les permissions de base Auth0 (Abonné Free)
            if (mgmtToken) {
                const freePerms = [
                    Permission.READ_API,
                    Permission.WRITE_API,
                    Permission.EXERCISES_READ,
                    Permission.MATCHES_CREATE,
                    Permission.MATCHES_CONTACT
                ];
                await addPermissionsToUser(mgmtToken, d1UserId, freePerms).catch((err) => console.error("Erreur réattribution perms Auth0:", err));
            }

            addToast({ title: "Utilisateur débloqué", description: "L'utilisateur a retrouvé ses droits d'Abonné (Free).", variant: "solid", color: "success" });

            // Force update editing state if the pane is open
            const newPerms: Record<string, boolean> = {};
            const freePermValues = [
                Permission.READ_API,
                Permission.WRITE_API,
                Permission.EXERCISES_READ,
                Permission.MATCHES_CREATE,
                Permission.MATCHES_CONTACT
            ];
            KDUFOOT_PERMISSIONS.forEach(p => {
                newPerms[p.key] = freePermValues.includes(p.value as Permission);
            });
            setEditing(prev => ({ ...prev, [d1UserId]: newPerms }));
            // Set reason to empty
            if (selectedUserId === d1UserId) setBlockReason("");

            // Modification optimiste de l'état local pour rafraîchir le bouton instantanément
            setUsers(prev => prev.map(u => {
                if (u.user_id !== d1UserId) return u;
                return {
                    ...u,
                    blocked: false,
                    app_metadata: {
                        ...u.app_metadata,
                        permissions: [
                            Permission.READ_API,
                            Permission.WRITE_API,
                            Permission.EXERCISES_READ,
                            Permission.MATCHES_CREATE,
                            Permission.MATCHES_CONTACT
                        ]
                    }
                };
            }));
        } catch (err: any) {
            addToast({ title: "Erreur", description: err.message, variant: "solid", color: "danger" });
        }
    };

    // ─── 6. Synchronisation des permissions sur Auth0 ───────────────────────
    const syncAuth0Permissions = async () => {
        if (!mgmtToken) return;
        setIsSyncing(true);
        try {
            const audience = import.meta.env.AUTH0_AUDIENCE;

            // Target scopes derived from the Permission enum
            const targetScopes = Object.values(Permission).map((val) => {
                const value = val as string;
                const key = value.replace(/:/g, "_");
                return {
                    value,
                    description: t(`permission.${key}`)
                };
            });

            // Check if synchronization is already up to date
            const isUpToDate = await checkResourceServerScopesWithAudience(mgmtToken, audience, targetScopes);

            if (isUpToDate) {
                addToast({
                    title: t("success"),
                    description: t("adminUsersPage.toasts.syncSuccess"), // Reusing success message for "already synced"
                    variant: "solid",
                    timeout: 5000
                });
                return;
            }

            // Perform the update
            await updateResourceServerScopesWithAudience(mgmtToken, audience, targetScopes);
            setIsUpToDate(true); // Mark as synced after update

            addToast({
                title: t("success"),
                description: t("adminUsersPage.toasts.syncSuccess"),
                variant: "solid",
                timeout: 5000
            });
        } catch (err) {
            console.error("Error synchronizing Auth0 Resource Server:", err);
            const msg = (err as Error).message ?? "";
            addToast({
                title: t("error"),
                description: msg.includes("not found")
                    ? t("adminUsersPage.toasts.noResourceServer")
                    : t("adminUsersPage.toasts.syncError"),
                variant: "solid"
            });
        } finally {
            setIsSyncing(false);
        }
    };

    // ─── Filtrage des utilisateurs par rôle ──────────────────────────────────
    const getIsAdmin = (u: Auth0User) =>
        u.app_metadata?.permissions?.includes('auth0:admin:api') ||
        u.app_metadata?.permissions?.includes('auth0:superadmin') ||
        u.email === SUPER_ADMIN_EMAIL;

    const filteredUsers = users.filter(u => {
        const hasBlockedRole = u.app_metadata?.permissions?.includes(Permission.ROLE_BLOCKED) || u.blocked;
        const isAdmin = getIsAdmin(u);

        if (roleFilter === 'all') return true;
        if (roleFilter === 'blocked') return hasBlockedRole;
        if (roleFilter === 'admins') return isAdmin;
        if (roleFilter === 'subscribers') return !hasBlockedRole && !isAdmin;
        return true;
    });

    // ─── Rendu ──────────────────────────────────────────────────────────────
    return (
        <DefaultLayout>
            <section className="flex flex-col gap-6 py-8 md:py-10 px-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{t("adminUsersPage.pageTitle")}</h1>
                        <p className="text-default-500 text-sm mt-1">
                            {t("adminUsersPage.pageSubtitle")}
                            {tokenFromCache && (
                                <span className="ml-2 text-success-600 text-xs">{t("adminUsersPage.cacheTokenSuccess")}</span>
                            )}
                        </p>
                    </div>
                    {isUpToDate === true ? (
                        <Chip
                            color="success"
                            variant="flat"
                            size="sm"
                            startContent={<span className="ml-1">✓</span>}
                        >
                            {t("adminUsersPage.auth0UpToDate")}
                        </Chip>
                    ) : (
                        <Button
                            color="secondary"
                            variant="flat"
                            size="sm"
                            onPress={syncAuth0Permissions}
                            isLoading={isSyncing}
                            isDisabled={!mgmtToken || isUpToDate === null}
                        >
                            {t("adminUsersPage.btnSyncAuth0")}
                        </Button>
                    )}
                </div>

                {/* ─── Filtres de rôle ───────────────────────────────────── */}
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-bold text-default-500">Filtrer :</span>
                    <Button
                        size="sm"
                        variant={roleFilter === 'all' ? 'solid' : 'flat'}
                        color={roleFilter === 'all' ? 'primary' : 'default'}
                        onPress={() => setRoleFilter('all')}
                    >
                        Tous ({users.length})
                    </Button>
                    <Button
                        size="sm"
                        variant={roleFilter === 'subscribers' ? 'solid' : 'flat'}
                        color={roleFilter === 'subscribers' ? 'success' : 'default'}
                        onPress={() => setRoleFilter('subscribers')}
                    >
                        Abonnés ({users.filter(u => !(u.app_metadata?.permissions?.includes(Permission.ROLE_BLOCKED) || u.blocked) && !getIsAdmin(u)).length})
                    </Button>
                    <Button
                        size="sm"
                        variant={roleFilter === 'admins' ? 'solid' : 'flat'}
                        color={roleFilter === 'admins' ? 'warning' : 'default'}
                        onPress={() => setRoleFilter('admins')}
                    >
                        Admins ({users.filter(u => getIsAdmin(u)).length})
                    </Button>
                    <Button
                        size="sm"
                        variant={roleFilter === 'blocked' ? 'solid' : 'flat'}
                        color={roleFilter === 'blocked' ? 'danger' : 'default'}
                        onPress={() => setRoleFilter('blocked')}
                        className={roleFilter === 'blocked' ? 'font-black' : ''}
                    >
                        🚫 Bloqués ({users.filter(u => u.app_metadata?.permissions?.includes(Permission.ROLE_BLOCKED) || u.blocked).length})
                    </Button>
                </div>

                {/* Table des utilisateurs */}
                {loadingUsers ? (
                    <p className="text-default-500">{t("adminUsersPage.loadingUsers")}</p>
                ) : (
                    <Table
                        aria-label="Utilisateurs Auth0"
                        selectionMode="none"
                        classNames={{
                            base: "dark",
                            wrapper: "bg-zinc-900 border border-white/10",
                            th: "bg-zinc-800 text-default-400"
                        }}
                    >
                        <TableHeader>
                            <TableColumn>{t("adminUsersPage.colUser")}</TableColumn>
                            <TableColumn>{t("adminUsersPage.colEmail")}</TableColumn>
                            <TableColumn>Rôle</TableColumn>
                            <TableColumn>{t("adminUsersPage.colSubscription")}</TableColumn>
                            <TableColumn>{t("adminUsersPage.colLogins")}</TableColumn>
                            <TableColumn>{t("adminUsersPage.colActions")}</TableColumn>
                        </TableHeader>
                        <TableBody emptyContent={t("adminUsersPage.emptyUsers")}>
                            {filteredUsers.map((u) => {
                                const isUserBlocked = u.app_metadata?.permissions?.includes(Permission.ROLE_BLOCKED) || u.blocked;
                                const isSuperAdmin = u.email === SUPER_ADMIN_EMAIL;
                                return (
                                    <TableRow
                                        key={u.user_id}
                                        className={isUserBlocked ? "bg-red-950/30 border-l-4 border-l-red-600" : ""}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {u.picture && (
                                                    <img
                                                        src={u.picture}
                                                        alt={u.name}
                                                        referrerPolicy="no-referrer"
                                                        className={`w-8 h-8 rounded-full ${isUserBlocked ? 'opacity-40 grayscale' : ''}`}
                                                    />
                                                )}
                                                <div>
                                                    <p className={`font-medium text-sm ${isUserBlocked ? 'text-red-400 line-through' : ''}`}>{u.name || u.nickname}</p>
                                                    <p className="text-xs text-default-400">{u.user_id}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <span className={`text-sm ${isUserBlocked ? 'text-red-400' : ''}`}>{u.email}</span>
                                                {u.email_verified && (
                                                    <span className="text-success-500 text-xs">✓</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {isSuperAdmin && (
                                                    <Chip size="sm" color="warning" variant="solid" className="h-5 text-xs sm:text-sm uppercase font-bold">S. Admin</Chip>
                                                )}
                                                {u.app_metadata?.permissions?.includes('auth0:admin:api') && !isSuperAdmin && (
                                                    <Chip size="sm" color="primary" variant="solid" className="h-5 text-xs sm:text-sm uppercase font-bold">Admin</Chip>
                                                )}
                                                {isUserBlocked && (
                                                    <Chip size="sm" color="danger" variant="solid" className="h-5 text-xs sm:text-sm uppercase font-black animate-pulse">🚫 BANNI</Chip>
                                                )}
                                                {u.app_metadata?.permissions?.includes('coach:certified') && (
                                                    <Chip size="sm" color="success" variant="solid" className="h-5 text-xs sm:text-sm uppercase font-bold italic">Certifié</Chip>
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
                                            <div className="flex justify-center w-full">
                                                <Button
                                                    size="sm"
                                                    variant="solid"
                                                    color="primary"
                                                    onPress={() => openUserEditing(u.user_id)}
                                                    isDisabled={!mgmtToken || (isSuperAdmin && u.user_id !== currentUserId)}
                                                    className="font-bold px-6"
                                                >
                                                    Voir le Profil
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}

                {/* ─── Modal de blocage avec motif ─────────────────────── */}
                <Modal
                    isOpen={!!blockingUserId}
                    onOpenChange={(open) => { if (!open) { setBlockingUserId(null); setBlockReason(""); } }}
                    classNames={{
                        base: "bg-zinc-900 border-2 border-red-600 shadow-2xl shadow-red-900/40",
                        backdrop: "bg-black/80 backdrop-blur-md"
                    }}
                    placement="center"
                    backdrop="blur"
                >
                    <ModalContent>
                        {(onClose) => (
                            <>
                                <ModalHeader className="flex flex-col gap-1">
                                    <h3 className="text-lg font-black text-red-500 uppercase tracking-tight flex items-center gap-2">
                                        🚫 Bannir cet utilisateur
                                    </h3>
                                </ModalHeader>
                                <ModalBody>
                                    <p className="text-sm text-default-400 font-medium leading-relaxed">
                                        Cette action va <strong className="text-red-400">supprimer définitivement</strong> tous les matchs et tournois créés par cet utilisateur.
                                    </p>
                                    <Input
                                        label="Motif du bannissement"
                                        placeholder="Ex: Comportement abusif, spam..."
                                        variant="bordered"
                                        value={blockReason}
                                        onValueChange={setBlockReason}
                                        classNames={{ inputWrapper: "border-red-600/50 h-12" }}
                                        autoFocus
                                    />
                                </ModalBody>
                                <ModalFooter>
                                    <Button
                                        variant="flat"
                                        onPress={onClose}
                                        className="font-bold"
                                    >
                                        Annuler
                                    </Button>
                                    <Button
                                        color="danger"
                                        className="font-black uppercase tracking-widest"
                                        onPress={() => confirmBlock(blockingUserId!)}
                                        isDisabled={blockReason.trim().length < 3}
                                    >
                                        CONFIRMER LE BAN
                                    </Button>
                                </ModalFooter>
                            </>
                        )}
                    </ModalContent>
                </Modal>

                {/* Panneau d'édition du profil (Modal) */}
                <Modal
                    isOpen={!!selectedUserId}
                    onClose={() => {
                        if (selectedUserId) {
                            setEditing((prev) => ({ ...prev, [selectedUserId]: {} }));
                        }
                        setSelectedUserId(null);
                        setSiretData(null);
                        setNewSiret("");
                        setForceSiret(false);
                    }}
                    size="4xl"
                    scrollBehavior="inside"
                    classNames={{ base: "bg-zinc-900 border border-white/10" }}
                >
                    <ModalContent>
                        {() => {
                            const targetUser = users.find((u) => u.user_id === selectedUserId);

                            return (
                                <>
                                    <ModalHeader className="flex flex-col gap-1 border-b border-white/5 pb-4">
                                        <h2 className="text-xl font-bold flex items-center gap-2">
                                            {t("adminUsersPage.modalTitlePrefix")}{" "}
                                            <span className="text-primary text-2xl ml-1">
                                                {targetUser?.name ?? selectedUserId}
                                            </span>
                                            {targetUser?.email === SUPER_ADMIN_EMAIL && (
                                                <Chip size="sm" color="warning" variant="solid" className="ml-2 h-5 text-xs sm:text-sm uppercase font-bold">
                                                    🛡️ PROTÉGÉ
                                                </Chip>
                                            )}
                                        </h2>
                                    </ModalHeader>
                                    <ModalBody className="py-6 space-y-6">
                                        {/* Statistiques de suivi */}
                                        {!modalLoading && siretData && (
                                            <div className="flex gap-4 mb-2">
                                                <div className="flex-1 p-3 rounded-xl bg-zinc-800/50 border border-white/5 text-center">
                                                    <p className="text-xs font-bold text-default-500 uppercase tracking-widest mb-1">Nombre de Bannissements</p>
                                                    <p className="text-2xl font-black text-red-500">{(siretData as any).block_count || 0}</p>
                                                </div>
                                                <div className="flex-1 p-3 rounded-xl bg-zinc-800/50 border border-white/5 text-center">
                                                    <p className="text-xs font-bold text-default-500 uppercase tracking-widest mb-1">Modifications SIRET</p>
                                                    <p className="text-2xl font-black text-primary">{(siretData as any).siret_change_count || 0}</p>
                                                </div>
                                            </div>
                                        )}

                                        {modalLoading ? (
                                            <p className="text-default-500">{t("adminUsersPage.modalLoadingPerms")}</p>
                                        ) : (
                                            <>
                                                {/* Gestion des SIRETs */}
                                                <div className="mb-6 p-4 border border-white/10 rounded-xl bg-zinc-800/50 shadow-sm mt-4">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <h3 className="text-md font-bold text-white flex items-center gap-2">
                                                            🏢 Gestion des SIRETs (Multi-clubs)
                                                        </h3>
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            onPress={() => selectedUserId && loadSirets(selectedUserId)}
                                                            isLoading={siretLoading}
                                                            isDisabled={!selectedUserId}
                                                        >
                                                            Actualiser
                                                        </Button>
                                                    </div>

                                                    {siretLoading ? (
                                                        <p className="text-default-500 text-sm">Chargement des SIRETs...</p>
                                                    ) : siretData ? (
                                                        <div className="flex flex-col gap-3">
                                                            {/* Primary Siret */}
                                                            {siretData.primary_siret ? (
                                                                <div className="flex items-center justify-between bg-zinc-900 border border-primary/20 p-3 rounded-lg shadow-sm">
                                                                    <div className="flex-1 min-w-0 mr-3">
                                                                        <span className="text-[10px] font-black text-primary uppercase tracking-tighter">Club Principal</span>
                                                                        <p className="text-sm font-bold text-white truncate">
                                                                            {siretData.primary_name || siretData.primary_siret}
                                                                        </p>
                                                                        <p className="text-[10px] text-zinc-500 font-mono">{siretData.primary_siret}</p>
                                                                    </div>
                                                                    <Button
                                                                        size="sm"
                                                                        color="danger"
                                                                        variant="flat"
                                                                        className="font-bold shrink-0"
                                                                        onPress={async () => {
                                                                            if (confirm("⚠️ Êtes-vous sûr de vouloir détacher le SIRET principal ? L'utilisateur n'aura plus de club lié et devra en choisir un nouveau.")) {
                                                                                setSiretLoading(true);
                                                                                try {
                                                                                    const token = await getAccessTokenSilently();
                                                                                    const res = await fetch(`${import.meta.env.API_BASE_URL || import.meta.env.VITE_API_URL}/api/admin/users/${selectedUserId}/primary-siret`, {
                                                                                        method: 'DELETE',
                                                                                        headers: { Authorization: `Bearer ${token}` }
                                                                                    });
                                                                                    if (res.ok) {
                                                                                        addToast({ title: "SIRET détaché", color: "success" });
                                                                                        if (selectedUserId) loadSirets(selectedUserId);
                                                                                    }
                                                                                } finally {
                                                                                    setSiretLoading(false);
                                                                                }
                                                                            }
                                                                        }}
                                                                    >
                                                                        Détacher
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <div className="p-3 border border-dashed border-white/10 rounded-lg text-center bg-zinc-800/20">
                                                                    <p className="text-xs text-default-400 uppercase font-bold italic">Aucun club principal lié</p>
                                                                </div>
                                                            )}

                                                            {/* Additional Sirets */}
                                                            <div className="flex flex-col gap-2 mt-2">
                                                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">Clubs Secondaires</span>
                                                                {siretData.additional_sirets && siretData.additional_sirets.length > 0 ? (
                                                                    siretData.additional_sirets.map((item: any) => (
                                                                        <div key={item.siret} className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800 p-2 rounded-lg">
                                                                            <div className="flex-1 min-w-0 mr-2">
                                                                                <p className="text-sm font-bold text-zinc-300 truncate">{item.name}</p>
                                                                                <p className="text-[9px] text-zinc-600 font-mono">{item.siret}</p>
                                                                            </div>
                                                                            <Button
                                                                                size="sm"
                                                                                color="danger"
                                                                                variant="flat"
                                                                                className="shrink-0 scale-90 origin-right"
                                                                                onPress={() => handleRemoveSiret(item.siret)}
                                                                            >
                                                                                Détacher
                                                                            </Button>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <p className="text-xs text-default-400 italic px-1">Aucun club secondaire</p>
                                                                )}
                                                            </div>

                                                            {/* Add Siret */}
                                                            <div className="flex flex-col gap-3 mt-4 p-3 bg-zinc-900/40 rounded-xl border border-white/5">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <p className="text-xs font-bold text-blue-400 uppercase px-1">
                                                                        ➕ Ajouter un SIRET/SIREN
                                                                    </p>
                                                                    <Checkbox
                                                                        size="sm"
                                                                        isSelected={forceSiret}
                                                                        onValueChange={setForceSiret}
                                                                        classNames={{ label: "text-xs font-bold text-warning-500 uppercase" }}
                                                                    >
                                                                        Forcer (Toute entreprise)
                                                                    </Checkbox>
                                                                </div>
                                                                <div className="flex gap-2 items-end">
                                                                    <Input
                                                                        label="Nouveau SIRET/SIREN"
                                                                        placeholder="Ex: 123 456 789 (9) ou 123 456 789 00012 (14)"
                                                                        size="sm"
                                                                        variant="bordered"
                                                                        value={newSiret}
                                                                        onValueChange={(v) => setNewSiret(formatSiret(v))}
                                                                        maxLength={18}
                                                                        errorMessage={newSiret && (newSiret.replace(/\s/g, '').length !== 14 && newSiret.replace(/\s/g, '').length !== 9) ? "9 ou 14 chiffres requis" : ""}
                                                                        isInvalid={newSiret.length > 0 && (newSiret.replace(/\s/g, '').length !== 14 && newSiret.replace(/\s/g, '').length !== 9)}
                                                                    />
                                                                    <div className="flex flex-col gap-2">
                                                                        <Button
                                                                            color="primary"
                                                                            size="sm"
                                                                            onPress={handleAddSiret}
                                                                            isDisabled={(newSiret.replace(/\s/g, '').length !== 14 && newSiret.replace(/\s/g, '').length !== 9) || siretLoading}
                                                                            isLoading={siretLoading}
                                                                            className="font-bold min-w-[120px]"
                                                                        >
                                                                            En additionnel
                                                                        </Button>
                                                                        <Button
                                                                            color="warning"
                                                                            size="sm"
                                                                            variant="shadow"
                                                                            onPress={async () => {
                                                                                if (!selectedUserId) return;
                                                                                const cleanSiret = newSiret.replace(/\s/g, '').trim();
                                                                                setSiretLoading(true);
                                                                                try {
                                                                                    const token = await getAccessTokenSilently();
                                                                                    const res = await fetch(`${import.meta.env.API_BASE_URL || import.meta.env.VITE_API_URL}/api/admin/users/${selectedUserId}/primary-siret`, {
                                                                                        method: 'POST',
                                                                                        headers: {
                                                                                            "Content-Type": "application/json",
                                                                                            Authorization: `Bearer ${token}`
                                                                                        },
                                                                                        body: JSON.stringify({ siret: cleanSiret, force: forceSiret })
                                                                                    });
                                                                                    if (res.ok) {
                                                                                        addToast({ title: "Club Principal mis à jour", color: "success" });
                                                                                        setNewSiret("");
                                                                                        setForceSiret(false);
                                                                                        loadSirets(selectedUserId);
                                                                                    } else {
                                                                                        const d = await res.json();
                                                                                        addToast({ title: "Erreur", description: d.error, color: "danger" });
                                                                                    }
                                                                                } finally {
                                                                                    setSiretLoading(false);
                                                                                }
                                                                            }}
                                                                            isDisabled={(newSiret.replace(/\s/g, '').length !== 14 && newSiret.replace(/\s/g, '').length !== 9) || siretLoading}
                                                                            isLoading={siretLoading}
                                                                            className="font-bold min-w-[120px]"
                                                                        >
                                                                            En Principal
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-default-500">Erreur lors du chargement des SIRETs.</p>
                                                    )}
                                                </div>

                                                {/* Super-Pouvoirs Admin: Stadium & Counters */}
                                                <div className="flex flex-col gap-4 p-4 bg-primary/5 border border-primary/20 rounded-2xl shadow-inner">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-lg">⚙️</span>
                                                        <h3 className="text-sm font-black text-primary uppercase tracking-wider">Super-Pouvoirs Admin (D1 Direct)</h3>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="md:col-span-2">
                                                            <Input
                                                                label="Adresse Physique du Stade"
                                                                placeholder="Complexe Sportif, 123 Rue de la Victoire"
                                                                size="sm"
                                                                variant="bordered"
                                                                value={adminStadiumAddress}
                                                                onValueChange={setAdminStadiumAddress}
                                                                description="Écrase le verrouillage utilisateur. Sert d'adresse par défaut pour les matchs."
                                                            />
                                                        </div>
                                                        <Input
                                                            type="number"
                                                            label="Compteur de Bannissements"
                                                            size="sm"
                                                            variant="bordered"
                                                            value={adminBlockCount?.toString()}
                                                            onValueChange={(v) => setAdminBlockCount(Number(v))}
                                                        />
                                                        <Input
                                                            type="number"
                                                            label="Changements de SIRET"
                                                            size="sm"
                                                            variant="bordered"
                                                            value={adminSiretChangeCount?.toString()}
                                                            onValueChange={(v) => setAdminSiretChangeCount(Number(v))}
                                                        />
                                                    </div>

                                                    <Button
                                                        color="primary"
                                                        variant="shadow"
                                                        size="sm"
                                                        className="font-black uppercase tracking-widest h-10 mt-1 shadow-primary/20"
                                                        onPress={handleUpdateUserProfile}
                                                        isLoading={isSavingProfile}
                                                    >
                                                        💾 Enregistrer les modifications D1
                                                    </Button>
                                                </div>

                                                {/* Actions Destructives */}
                                                {(() => {
                                                    const targetUser = users.find(u => u.user_id === selectedUserId);
                                                    const isSuperAdminTarget = targetUser?.email === SUPER_ADMIN_EMAIL;
                                                    const isTargetBlocked = targetUser?.app_metadata?.permissions?.includes(Permission.ROLE_BLOCKED) || targetUser?.blocked;

                                                    if (!isSuperAdminTarget && selectedUserId !== currentUserId) {
                                                        return (
                                                            <div className="mb-6 p-4 border border-danger-500/30 rounded-xl bg-danger-500/10">
                                                                <h3 className="text-md font-bold text-danger-500 mb-3 flex items-center gap-2">
                                                                    🛡️ Sécurité & Compte
                                                                </h3>
                                                                <div className="flex flex-col sm:flex-row gap-3">
                                                                    {isTargetBlocked ? (
                                                                        <Button
                                                                            size="md"
                                                                            variant="solid"
                                                                            color="primary"
                                                                            className="font-bold uppercase tracking-tight flex-1"
                                                                            onPress={() => handleUnblockUser(selectedUserId as string)}
                                                                        >
                                                                            Débloquer l'utilisateur
                                                                        </Button>
                                                                    ) : (
                                                                        <Button
                                                                            size="md"
                                                                            variant="solid"
                                                                            color="danger"
                                                                            className="font-bold flex-1"
                                                                            onPress={() => handleBlockUser(selectedUserId as string, targetUser?.email || '')}
                                                                        >
                                                                            🚫 Bloquer l'utilisateur
                                                                        </Button>
                                                                    )}
                                                                    <Button
                                                                        size="md"
                                                                        variant="flat"
                                                                        color="danger"
                                                                        className="flex-1"
                                                                        onPress={() => deleteUser(selectedUserId as string)}
                                                                        isDisabled={!mgmtToken}
                                                                    >
                                                                        Supprimer le compte
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                })()}

                                                <div className="p-4 bg-zinc-800/50 rounded-xl border border-white/5 space-y-4">
                                                    <h3 className="text-md font-bold text-white mb-2 flex items-center gap-2">
                                                        🔑 Permissions de l'utilisateur
                                                    </h3>

                                                    <div className="mb-4 flex flex-wrap gap-2 items-center">
                                                        <span className="text-sm font-medium text-default-400">Attribution rapide :</span>
                                                        <Button size="sm" variant="flat" color="default" onPress={() => applyRole("free")}>
                                                            Abonné Free
                                                        </Button>
                                                        <Button size="sm" variant="flat" color="warning" onPress={() => applyRole("premium")}>
                                                            Abonné Premium
                                                        </Button>
                                                        <Button size="sm" variant="flat" color="secondary" onPress={() => applyRole("admin")}>
                                                            Administrateur
                                                        </Button>
                                                        <Button size="sm" variant="flat" color="danger" onPress={() => applyRole("superadmin")}>
                                                            Super Administrateur
                                                        </Button>
                                                        <Button size="sm" variant="solid" color="danger" className="font-black" onPress={() => applyRole("blocked")}>
                                                            🚫 BLOQUÉ
                                                        </Button>
                                                    </div>

                                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
                                                                <div key={groupKey} className={`rounded-lg p-3 ${groupKey === 'role' ? 'bg-red-950/30 border border-red-600/30' : 'bg-zinc-900 border border-white/10'}`}>
                                                                    <Chip size="sm" color={groupColor(groupKey)} variant="flat" className="mb-2">
                                                                        {group.label}
                                                                    </Chip>
                                                                    <div className="flex flex-col gap-1.5">
                                                                        {group.perms.map((perm) => {
                                                                            const isSuperAdminTarget = users.find(u => u.user_id === selectedUserId)?.email === SUPER_ADMIN_EMAIL;
                                                                            return (
                                                                                <div key={perm.key} className="flex flex-col gap-2">
                                                                                    <Checkbox
                                                                                        isSelected={editing[selectedUserId ?? '']?.[perm.key] ?? false}
                                                                                        onValueChange={() => togglePermission(selectedUserId as string, perm.key)}
                                                                                        size="sm"
                                                                                        color={perm.key === 'role_blocked' ? 'danger' : undefined}
                                                                                        isDisabled={
                                                                                            // Empêcher de retirer sa propre permission auth0:admin:api
                                                                                            (selectedUserId === currentUserId && perm.value === "auth0:admin:api") ||
                                                                                            // Super-admin protection
                                                                                            (isSuperAdminTarget && selectedUserId !== currentUserId)
                                                                                        }
                                                                                    >
                                                                                        <span className={`text-xs ${perm.key === 'role_blocked' ? 'font-black text-red-500 uppercase' : 'text-default-300'}`}>
                                                                                            {perm.key === 'role_blocked' ? '🚫 ' : ''}{perm.label}
                                                                                        </span>
                                                                                    </Checkbox>

                                                                                    {/* Reason input when block is active */}
                                                                                    {perm.key === 'role_blocked' && (editing[selectedUserId ?? '']?.[perm.key] ?? false) && (
                                                                                        <div className="pl-6 pb-2 animate-appearance-in">
                                                                                            <Input
                                                                                                size="sm"
                                                                                                label="Motif du bannissement"
                                                                                                placeholder="Saisissez un motif pour l'utilisateur"
                                                                                                variant="flat"
                                                                                                color="danger"
                                                                                                value={blockReason}
                                                                                                onValueChange={setBlockReason}
                                                                                                classNames={{ inputWrapper: "bg-danger-900/40 text-red-100" }}
                                                                                            />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            ));
                                                        })()}
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </ModalBody>
                                    <ModalFooter className="border-t border-white/5">
                                        <Button
                                            variant="flat"
                                            size="lg"
                                            className="font-semibold text-default-600 bg-white/5"
                                            onPress={() => {
                                                if (selectedUserId) {
                                                    setEditing((prev) => ({ ...prev, [selectedUserId]: {} }));
                                                }
                                                setSelectedUserId(null);
                                                setSiretData(null);
                                                setNewSiret("");
                                                setForceSiret(false);
                                            }}
                                        >
                                            Fermer le profil
                                        </Button>
                                        <Button
                                            color="primary"
                                            size="lg"
                                            className="font-bold shadow-lg shadow-primary-500/30 ml-3"
                                            onPress={() => savePermissions(selectedUserId as string)}
                                            isLoading={savingUserId === selectedUserId}
                                            isDisabled={
                                                modalLoading ||
                                                Object.keys(editing[selectedUserId ?? ''] ?? {}).length === 0 ||
                                                (editing[selectedUserId ?? '']?.['role_blocked'] && blockReason.trim().length < 3)
                                            }
                                        >
                                            Sauvegarder les modifications
                                        </Button>
                                    </ModalFooter>
                                </>
                            );
                        }}
                    </ModalContent >
                </Modal>
            </section>
        </DefaultLayout>
    );
}
