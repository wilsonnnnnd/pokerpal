import { StyleSheet } from 'react-native';
import { Palette as color } from '@/constants';


const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: color.background
    },
    card: {
        padding: 30,
        borderRadius: 16,
        alignItems: 'center',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        backgroundColor: color.card,
        shadowColor: color.shadowLight
    },
    icon: {
        fontSize: 48,
        marginBottom: 12,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 6,
        color: color.text
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 24,
        textAlign: 'center',
        color: color.mutedText
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    button: {
        backgroundColor: color.background,
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    buttonText: {
        color: color.text,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default styles;