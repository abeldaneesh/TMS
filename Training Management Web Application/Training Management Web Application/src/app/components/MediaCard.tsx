import React from 'react';
import { Play } from 'lucide-react';
import { Badge } from './ui/badge';

export interface MediaCardProps {
    id: string;
    title: string;
    subtitle: string;
    imageUrl?: string;
    imageFallbackText?: string;
    onClick?: () => void;
    statusBadge?: string;
    statusColor?: string;
}

const MediaCard: React.FC<MediaCardProps> = ({
    title,
    subtitle,
    imageUrl,
    imageFallbackText,
    onClick,
    statusBadge,
    statusColor,
}) => {
    return (
        <div
            onClick={onClick}
            className="group flex flex-col min-w-[170px] w-[170px] sm:min-w-[190px] sm:w-[190px] cursor-pointer"
        >
            <div className="relative aspect-square w-full rounded-md overflow-hidden bg-muted mb-3 shadow-md">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary text-secondary-foreground text-5xl font-bold transition-transform duration-300 group-hover:scale-105 opacity-80 backdrop-blur-sm">
                        {imageFallbackText || title.charAt(0).toUpperCase()}
                    </div>
                )}

                {/* Play Button Overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="bg-primary text-primary-foreground rounded-full p-3.5 shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 hover:scale-110">
                        <Play className="size-6 fill-current ml-1" />
                    </div>
                </div>

                {statusBadge && (
                    <div className="absolute top-2 right-2">
                        <Badge className={`${statusColor || 'bg-black/60 text-white'} shadow-md text-[10px] px-1.5 py-0 h-4 uppercase tracking-wider`}>
                            {statusBadge}
                        </Badge>
                    </div>
                )}
            </div>

            <h4 className="font-semibold text-sm sm:text-base text-foreground truncate group-hover:text-primary transition-colors">
                {title}
            </h4>
            <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                {subtitle}
            </p>
        </div>
    );
};

export default MediaCard;
