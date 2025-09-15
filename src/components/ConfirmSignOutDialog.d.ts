import React from 'react';
export type ConfirmSignOutDialogProps = {
    open: boolean;
    onConfirm: () => void;
    onCancel: () => void;
};
declare const ConfirmSignOutDialog: React.FC<ConfirmSignOutDialogProps>;
export default ConfirmSignOutDialog;
