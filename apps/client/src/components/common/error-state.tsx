import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

interface ErrorStateProps {
	title?: string;
	message?: string;
	onRetry?: () => void;
	showHome?: boolean;
}

export const ErrorState = ({
	title = "Une erreur est survenue",
	message = "Nous n'avons pas pu charger cette page. Veuillez réessayer.",
	onRetry,
	showHome = true,
}: ErrorStateProps) => {
	return (
		<div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
			<Card className="max-w-md w-full border-danger bg-danger-50 dark:bg-danger-100/10">
				<CardBody className="flex flex-col items-center gap-4 py-8">
					<div className="p-3 bg-danger/10 rounded-full text-danger">
						<AlertTriangle size={32} />
					</div>
					<div className="space-y-2">
						<h3 className="text-xl font-bold text-foreground">{title}</h3>
						<p className="text-sm text-default-500">{message}</p>
					</div>

					<div className="flex flex-wrap gap-3 mt-4 justify-center">
						{onRetry && (
							<Button color="primary" onPress={onRetry} startContent={<RefreshCw size={18} />}>
								Réessayer
							</Button>
						)}
						{showHome && (
							<Button as={Link} to="/" variant="flat" startContent={<Home size={18} />}>
								Retour à l'accueil
							</Button>
						)}
					</div>
				</CardBody>
			</Card>
		</div>
	);
};
