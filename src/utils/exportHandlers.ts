import * as Clipboard from 'expo-clipboard';
import { Alert } from 'react-native';
import { generateGameSummary } from '../utils/gameSummaryUtils';


export const handleCopyToClipboard = async (game: any, setCopying: (val: boolean) => void, showPopup: (props: any) => void) => {
    if (!game) return;

    setCopying(true);
    try {
        const message = generateGameSummary(game);
        await Clipboard.setStringAsync(message);
        await showPopup({
            title: '复制成功',
            message: '战绩已复制到剪贴板',
            isWarning: false,
        });
    } catch (error) {
        Alert.alert('复制失败', '无法复制数据到剪贴板');
    } finally {
        setCopying(false);
    }
};

export const handleSendEmail = async (setEmailing: (val: boolean) => void, showPopup: (props: any) => void) => {
    setEmailing(true);
    try {

        await showPopup({
            title: '发送成功',
            message: '战绩已发送到邮箱',
            isWarning: false,
        });
        // 这里可以添加实际的发送邮件逻辑，例如调用邮件 API
        // 例如：sendEmail(email, subject, body)
        setEmailing(false);

    } catch (error) {
        await showPopup({
            title: '发送失败',
            message: '无法发送邮件，请稍后再试',
            isWarning: true,
        });
        setEmailing(false);
    }
};
