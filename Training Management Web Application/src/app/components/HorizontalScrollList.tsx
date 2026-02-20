import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

export interface HorizontalScrollListProps {
    title: string;
    subtitle?: string;
    avatarUrl?: string;
    children: React.ReactNode;
}

const HorizontalScrollList: React.FC<HorizontalScrollListProps> = ({ title, subtitle, avatarUrl, children }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -400, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 400, behavior: 'smooth' });
        }
    };

    return (
        <div className="mb-12 w-full overflow-hidden">
            <div className="flex items-end justify-between mb-4 mt-2">
                <div className="flex items-center gap-4">
                    {avatarUrl && (
                        <div className="size-12 rounded-full overflow-hidden shrink-0 hidden sm:block">
                            <img src={avatarUrl} alt="Channel avatar" className="w-full h-full object-cover" />
                        </div>
                    )}
                    <div className="flex flex-col">
                        {subtitle && (
                            <p className="text-xs sm:text-sm text-muted-foreground font-medium uppercase tracking-wider mb-1">
                                {subtitle}
                            </p>
                        )}
                        <h2 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                            {title}
                        </h2>
                    </div>
                </div>

                <div className="hidden sm:flex gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full size-10 hover:bg-secondary/50 text-foreground"
                        onClick={scrollLeft}
                    >
                        <ChevronLeft className="size-6" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full size-10 hover:bg-secondary/50 text-foreground"
                        onClick={scrollRight}
                    >
                        <ChevronRight className="size-6" />
                    </Button>
                </div>
            </div>

            <div className="relative -mx-4 sm:mx-0">
                <div
                    ref={scrollContainerRef}
                    className="flex gap-4 sm:gap-6 overflow-x-auto px-4 sm:px-0 scroll-smooth pb-4 snap-x snap-mandatory hide-scroll"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {React.Children.map(children, (child) => (
                        <div className="snap-start shrink-0">
                            {child}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HorizontalScrollList;
