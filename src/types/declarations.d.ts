declare module 'react-native-qrcode' {
    import React from 'react';
    import { ViewStyle } from 'react-native';

    interface QRCodeProps {
        value: string;
        size?: number;
        bgColor?: string;
        fgColor?: string;
        style?: ViewStyle;
    }

    const QRCode: React.FC<QRCodeProps>;
    export default QRCode;
}