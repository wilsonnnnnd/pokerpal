import React, { createContext, useContext, useState, ReactNode } from 'react';
import MsgPopUp from '@/components/MessagePopUp';
import { MsgPopUpProps } from '@/types';

type ConfirmPopup = (props: Omit<MsgPopUpProps, 'onConfirm' | 'onCancel'>) => Promise<boolean>;

interface PopupContextType {
    confirmPopup: ConfirmPopup;
}

const PopupContext = createContext<PopupContextType | null>(null);

export const usePopup = () => {
    const context = useContext(PopupContext);
    if (!context) throw new Error('usePopup must be used within a PopupProvider');
    return context;
};

export const PopupProvider = ({ children }: { children: ReactNode }) => {
    const [popupProps, setPopupProps] = useState<MsgPopUpProps | null>(null);

    const confirmPopup: ConfirmPopup = (props) => {
        return new Promise((resolve) => {
            setPopupProps({
                ...props,
                onConfirm: () => {
                    resolve(true);
                    setPopupProps(null);
                },
                onCancel: () => {
                    resolve(false);
                    setPopupProps(null);
                },
            });
        });
    };

    return (
        <PopupContext.Provider value={{ confirmPopup }}>
            {children}
            {popupProps && <MsgPopUp {...popupProps} />}
        </PopupContext.Provider>
    );
};