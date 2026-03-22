import React from 'react';
import { Button } from '@heroui/button';
import { motion } from 'framer-motion';

interface EmptyStateProps {
    title: string;
    description: string;
    icon?: React.ReactNode;
    actionLabel?: string;
    onAction?: () => void;
}

/**
 * Premium EmptyState component for lists.
 * Uses glassmorphism and subtle animations.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ 
    title, 
    description, 
    icon, 
    actionLabel, 
    onAction 
}) => {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            role="status"
            className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl"
        >
            <div className="w-20 h-20 mb-6 flex items-center justify-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">
                {icon || (
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                )}
            </div>
            <h3 className="text-xl font-black tracking-tighter text-white mb-2">{title}</h3>
            <p className="text-default-400 max-w-sm mb-8">{description}</p>
            {actionLabel && onAction && (
                <Button 
                    className="font-black tracking-tighter shadow-lg shadow-primary/20" 
                    color="primary"
                    onPress={onAction}
                >
                    {actionLabel}
                </Button>
            )}
        </motion.div>
    );
};
