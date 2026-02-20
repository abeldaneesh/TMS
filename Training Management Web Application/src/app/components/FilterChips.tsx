import React from 'react';

export interface FilterOption {
    value: string;
    label: string;
}

export interface FilterChipsProps {
    options: FilterOption[];
    selectedValue: string;
    onChange: (value: string) => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({ options, selectedValue, onChange }) => {
    return (
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scroll" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {options.map((option) => (
                <button
                    key={option.value}
                    onClick={() => onChange(option.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${selectedValue === option.value
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-secondary/40 text-foreground hover:bg-secondary/60 border-transparent'
                        }`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
};

export default FilterChips;
