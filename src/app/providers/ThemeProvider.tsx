import React, { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from 'react';

interface ThemeContextType {
    isDarkMode: boolean;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    // 🚨 FIX REACT DOCTOR: Inicialización síncrona perezosa en lugar de useEffect para evitar salto de UI
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.documentElement.classList.remove('dark');
            return false;
        } else {
            document.documentElement.classList.add('dark');
            return true;
        }
    });

    const toggleTheme = React.useCallback(() => {
        setIsDarkMode((prev) => {
            const newValue = !prev;
            if (newValue) {
                document.documentElement.classList.add('dark');
                localStorage.setItem('theme', 'dark');
            } else {
                document.documentElement.classList.remove('dark');
                localStorage.setItem('theme', 'light');
            }
            return newValue;
        });
    }, []);

    // 🚨 FIX REACT DOCTOR: useMemo para estabilizar el contexto
    const contextValue = useMemo(() => ({
        isDarkMode,
        toggleTheme
    }), [isDarkMode, toggleTheme]);

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme debe usarse dentro de un ThemeProvider');
    }
    return context;
};