"use client";

// biome-ignore assist/source/organizeImports: <explanation>
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

export interface GroupedSelectOption
{
  key: string;
  label: string;
  isGroupTitle?: boolean;
  isSeparator?: boolean;
}

interface GroupedSelectProps
{
  value: string;
  onChange: ( value: string ) => void;
  options: GroupedSelectOption[];
  className?: string;
}

export function GroupedSelect( {
  value,
  onChange,
  options,
  className,
}: GroupedSelectProps )
{
  const [isOpen, setIsOpen] = useState( false );
  const containerRef = useRef<HTMLDivElement>( null );

  const selectedOption = options.find(
    ( opt ) => opt.key === value && !opt.isGroupTitle && !opt.isSeparator,
  );
  const displayLabel = selectedOption?.label || "Select...";

  useEffect( () =>
  {
    const handleClickOutside = ( event: MouseEvent ) =>
    {
      if (
        containerRef.current &&
        !containerRef.current.contains( event.target as Node )
      ) {
        setIsOpen( false );
      }
    };

    if ( isOpen ) {
      document.addEventListener( "mousedown", handleClickOutside );
      return () =>
        document.removeEventListener( "mousedown", handleClickOutside );
    }
  }, [isOpen] );

  const handleSelect = ( option: GroupedSelectOption ) =>
  {
    if ( option.isGroupTitle || option.isSeparator ) return;
    onChange( option.key );
    setIsOpen( false );
  };

  return (
    <div ref={containerRef} className={cn( "relative", className )}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen( !isOpen )}
        className="w-full px-3 py-2 bg-slate-800 text-white border border-slate-600 rounded text-sm font-medium transition-colors hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 flex items-center justify-between"
      >
        <span>{displayLabel}</span>
        <svg
          className={cn(
            "w-4 h-4 transition-transform",
            isOpen && "transform rotate-180",
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <title>Toggle Dropdown</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-100 w-full mt-1 bg-slate-800 border border-slate-600 rounded shadow-lg max-h-80 overflow-y-auto">
          {options.map( ( option, index ) =>
          {
            if ( option.isSeparator ) {
              return (
                <div
                  key={`${ option.key }-${ index }`}
                  className="border-t border-slate-600 my-1"
                />
              );
            }

            if ( option.isGroupTitle ) {
              return (
                <div
                  key={`${ option.key }-${ index }`}
                  className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-750"
                >
                  {option.label}
                </div>
              );
            }

            const isSelected = option.key === value;

            return (
              <button
                key={`${ option.key }-${ index }`}
                type="button"
                onClick={() => handleSelect( option )}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm transition-colors hover:bg-slate-700",
                  isSelected && "bg-indigo-600 hover:bg-indigo-700 font-medium",
                )}
              >
                {option.label}
              </button>
            );
          } )}
        </div>
      )}
    </div>
  );
}
