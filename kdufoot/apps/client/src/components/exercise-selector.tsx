
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Card, CardBody } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { useState } from "react";
import { useExercises } from "@/hooks/use-exercises";
import { Exercise, Category, Theme } from "@/types/exercise.types";
import { Spinner } from "@heroui/spinner";

interface ExerciseSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (exercises: Exercise[]) => void;
}

export default function ExerciseSelector({ isOpen, onClose, onSelect }: ExerciseSelectorProps) {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState<Category | "">("");
    const [theme, setTheme] = useState<Theme | "">("");
    const [selectedExercises, setSelectedExercises] = useState<Set<string>>(new Set());

    // Fetch exercises with filters
    const { exercises, isLoading } = useExercises({
        search: search,
        category: category as Category,
        theme: theme as Theme,
        limit: 20
    });

    const handleSelect = (exercise: Exercise) => {
        const newSelected = new Set(selectedExercises);
        if (newSelected.has(exercise.id)) {
            newSelected.delete(exercise.id);
        } else {
            newSelected.add(exercise.id);
        }
        setSelectedExercises(newSelected);
    };

    const handleConfirm = () => {
        if (!exercises) return;
        const selected = exercises.filter((ex) => selectedExercises.has(ex.id));
        onSelect(selected);
        onClose();
        setSelectedExercises(new Set()); // Reset selection
    };

    const categories = [
        { key: "", label: "Toutes" },
        ...Object.values(Category).map(c => ({ key: c, label: c }))
    ];

    const themes = [
        { key: "", label: "Tous" },
        ...Object.values(Theme).map(t => ({ key: t, label: t }))
    ];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            size="2xl"
            scrollBehavior="inside"
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className="flex flex-col gap-1">Ajouter des exercices</ModalHeader>
                        <ModalBody>
                            <div className="flex flex-col gap-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                    <Input
                                        placeholder="Rechercher..."
                                        value={search}
                                        onValueChange={setSearch}
                                        className="md:col-span-1"
                                    />
                                    <Select
                                        placeholder="Catégorie"
                                        selectedKeys={category ? [category] : []}
                                        onChange={(e) => setCategory(e.target.value as Category)}
                                        items={categories}
                                    >
                                        {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
                                    </Select>
                                    <Select
                                        placeholder="Thème"
                                        selectedKeys={theme ? [theme] : []}
                                        onChange={(e) => setTheme(e.target.value as Theme)}
                                        items={themes}
                                    >
                                        {(item) => <SelectItem key={item.key}>{item.label}</SelectItem>}
                                    </Select>
                                </div>

                                <div className="flex flex-col gap-2 min-h-[300px]">
                                    {isLoading ? (
                                        <div className="flex justify-center items-center h-full">
                                            <Spinner />
                                        </div>
                                    ) : (
                                        exercises.map((exercise) => (
                                            <Card
                                                key={exercise.id}
                                                isPressable
                                                onPress={() => handleSelect(exercise)}
                                                className={`border-2 ${selectedExercises.has(exercise.id) ? 'border-primary' : 'border-transparent'}`}
                                            >
                                                <CardBody className="flex flex-row justify-between items-center p-3">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold">{exercise.title}</span>
                                                        <div className="flex gap-2 text-tiny text-default-500">
                                                            <Chip size="sm" variant="flat">{exercise.category}</Chip>
                                                            {exercise.themes.map(t => <Chip key={t} size="sm" variant="dot">{t}</Chip>)}
                                                        </div>
                                                    </div>
                                                    {selectedExercises.has(exercise.id) && (
                                                        <Chip color="primary" size="sm">Sélectionné</Chip>
                                                    )}
                                                </CardBody>
                                            </Card>
                                        ))
                                    )}
                                    {!isLoading && exercises.length === 0 && (
                                        <div className="text-center text-default-500 py-8">
                                            Aucun exercice trouvé.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </ModalBody>
                        <ModalFooter>
                            <Button color="danger" variant="light" onPress={onClose}>
                                Annuler
                            </Button>
                            <Button color="primary" onPress={handleConfirm} isDisabled={selectedExercises.size === 0}>
                                Ajouter ({selectedExercises.size})
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    );
}
