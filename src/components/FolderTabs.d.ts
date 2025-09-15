import React from 'react';
export type TabItem = {
    id: string;
    label: React.ReactNode;
    content: React.ReactNode;
    buttonProps?: React.ButtonHTMLAttributes<HTMLButtonElement>;
};
export type FolderTabsProps = {
    tabs: TabItem[];
    ariaLabel: string;
    initialActiveId?: string;
    onChange?: (id: string) => void;
    brand?: React.ReactNode;
    idPrefix?: string;
};
declare const FolderTabs: React.FC<FolderTabsProps>;
export default FolderTabs;
