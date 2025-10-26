import { StyleSheet, Dimensions } from 'react-native';
import { Palette as color, Palette } from '@/constants';
import Tokens, { Spacing, Radius, FontSize, Elevation, Shadow, Button } from '@/constants/designTokens';

const { height: screenHeight } = Dimensions.get('window');
const maxModalHeight = screenHeight * 0.9;


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: color.background,
    },
    card: {
        padding: Tokens.Spacing.xxl,
        borderRadius: Radius.lg,
        alignItems: 'center',
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: Elevation.card,
        backgroundColor: color.card,
        shadowColor: Shadow.light,
    },
    icon: {
        fontSize: 48,
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: FontSize.h1,
        fontWeight: 'bold',
        marginBottom: 6,
        color: color.text,
    },
    subtitle: {
        fontSize: FontSize.body,
        marginBottom: Spacing.xl,
        textAlign: 'center',
        color: color.mutedText,
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: color.overlayDark,
    },
    button: {
        backgroundColor: color.background,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        borderRadius: Button.radius,
        alignItems: 'center',
    },
    buttonText: {
        color: color.text,
        textAlign: 'center',
        fontSize: FontSize.body,
        fontWeight: '600',
    },
    keyboardAvoidingView: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: Spacing.xxl,
    },
    logoPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: Spacing.xl,
        backgroundColor: color.card,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: {
        color: color.lightText,
        fontWeight: 'bold',
    },
    formContainer: {
        backgroundColor: color.lightGray,
        borderRadius: Radius.md,
        padding: Spacing.lg,
        shadowColor: Shadow.dark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: Elevation.card,
    },
    inputContainer: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: color.borderColor,
        borderRadius: Radius.md,
        marginBottom: Spacing.lg,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        alignItems: 'center',
        backgroundColor: color.lightGray,
    },
    inputIcon: {
        marginRight: Spacing.sm,
    },
    input: {
        flex: 1,
        fontSize: FontSize.body,
        color: color.text,
    },
    eyeIcon: {
        padding: Spacing.xs,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: Radius.sm,
        marginBottom: Spacing.lg,
    },
    error: {
        color: color.error,
        marginLeft: Spacing.sm,
        fontSize: FontSize.small,
    },
    loginButton: {
        backgroundColor: color.card,
        borderRadius: Radius.md,
        paddingVertical: Button.paddingVertical,
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
});

export const HomePagestyles = StyleSheet.create({
    container: {
        ...styles.container,
        paddingTop: 0,
    },
    loadingContainer: {
        ...styles.container,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: Spacing.md,
        fontSize: FontSize.body,
        color: color.loadingText,
    },
    heroGradient: {
        width: '100%',
        paddingTop: Spacing.xxl + 20,
        paddingBottom: Spacing.xl,
        paddingHorizontal: Spacing.xl,
        alignItems: 'center',
        borderBottomLeftRadius: Radius.lg,
        borderBottomRightRadius: Radius.lg,
        shadowColor: color.shadowLight,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 10,
        marginBottom: Spacing.xl,
    },
    mainContent: {
        flex: 1,
        width: '100%',
        paddingHorizontal: Spacing.xl,
    },
    userCard: {
        width: '100%',
        backgroundColor: color.lightBackground,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.lg,
        shadowColor: color.shadowLight,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        borderLeftWidth: 4,
        borderLeftColor: color.primary,
    },
    userInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        marginRight: Spacing.md,
        overflow: 'hidden',
        backgroundColor: color.lightGray,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: color.primary,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: FontSize.h3,
        fontWeight: '700',
        color: color.title,
        marginBottom: 2,
    },
    userEmail: {
        fontSize: FontSize.small,
        color: color.mutedText,
        marginBottom: 4,
    },
    roleText: {
        fontSize: FontSize.small,
        color: color.mutedText,
        marginRight: Spacing.sm,
    },
    vipBadge: {
        backgroundColor: color.primary,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: Radius.sm,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: color.shadowLight,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 2,
    },
    vipText: {
        fontSize: 10,
        color: color.lightText,
        fontWeight: '700',
        marginLeft: 2,
    },
    buttonsSection: {
        width: '100%',
        marginBottom: Spacing.xl,
    },
    
    footerSection: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: Spacing.lg,
        backgroundColor: color.lightGray,
    },
    icon: {
        marginBottom: Spacing.md,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        padding: Spacing.md,
        borderRadius: Radius.round,
    },
    title: {
        fontSize: FontSize.h1,
        fontWeight: '800',
        color: color.lightText,
        marginBottom: Spacing.xs,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: FontSize.body,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        fontWeight: '500',
    },
    buttonGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: Spacing.sm,
    },

    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    footerText: {
        fontSize: FontSize.small,
        color: color.mutedText,
        textAlign: 'center',
    },
    // HomeScreen extra styles
    userCardExtra: {
        marginBottom: Spacing.lg,
        backgroundColor: color.lightBackground,
        borderWidth: 1,
        borderColor: color.lightGray + '60',
        shadowColor: color.shadowLight,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 3,
    },
    avatarWrapper: {
        borderRadius: Radius.round,
        padding: 3,
        shadowColor: color.shadowLight,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    userAvatarPrimary: {
        backgroundColor: color.primary,
        borderWidth: 3,
        borderColor: color.background,
        shadowColor: color.shadowLight,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    userAvatarRound: {
        borderRadius: Radius.round,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    vipBadgeSmall: {
        borderRadius: Radius.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        shadowColor: color.shadowLight,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 1,
    },
    userEmailMargin: {
        marginBottom: Spacing.sm,
    },
    roleBadge: {
        backgroundColor: color.primary + '10',
        borderRadius: Radius.md,
        padding: Spacing.sm,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: color.primary + '20',
    },
    gamesStatCard: {
        backgroundColor: color.info + '10',
        borderRadius: Radius.md,
        padding: Spacing.sm,
        marginBottom: Spacing.xs,
        borderWidth: 1,
        borderColor: color.info + '20',
    },
    profitCard: {
        borderRadius: Radius.md,
        padding: Spacing.sm,
        marginBottom: Spacing.xs,
    },
    profitCardPositive: {
        backgroundColor: color.confirm + '10',
        borderWidth: 1,
        borderColor: color.confirm + '20',
    },
    profitCardNegative: {
        backgroundColor: color.error + '10',
        borderWidth: 1,
        borderColor: color.error + '20',
    },
    roiCardPositive: {
        backgroundColor: color.confirm + '10',
        borderRadius: Radius.md,
        padding: Spacing.sm,
        borderWidth: 1,
        borderColor: color.confirm + '20',
    },
    roiCardNegative: {
        backgroundColor: color.error + '10',
        borderRadius: Radius.md,
        padding: Spacing.sm,
        borderWidth: 1,
        borderColor: color.error + '20',
    },
    cardGradientWrapper: {
        borderRadius: Radius.lg,
        overflow: 'hidden',
    },
    startButtonTouchable: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xl,
    },
    actionsCard: {
        width: '100%',
        backgroundColor: color.lightBackground,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        marginBottom: Spacing.md,
        shadowColor: color.shadowLight,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: color.lightGray + '50',
    },
    actionsTitle: {
        fontSize: FontSize.body,
        fontWeight: '700',
        color: color.title,
        marginBottom: Spacing.md,
        textAlign: 'center',
    },
    gridButtonBase: {
        backgroundColor: color.lightBackground,
        borderRadius: Radius.md,
        padding: Spacing.xs,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        shadowColor: color.shadowLight,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        minHeight: 65,
    },
    gridButtonIcon: {
        marginBottom: Spacing.xs,
    },
    gridButtonText: {
        fontSize: FontSize.small - 1,
        fontWeight: '600',
        textAlign: 'center',
    },
    roleTextBold: {
        fontWeight: '600',
    },
    logoutCard: {
        width: '100%',
        backgroundColor: color.lightBackground,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        shadowColor: color.shadowLight,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: color.lightGray + '50',
    },
    logoutTouchable: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: Radius.md,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
    },
    logoutIcon: {
        marginRight: Spacing.sm,
    },
    logoutText: {
        fontSize: FontSize.body,
        fontWeight: '600',
    },
    actionSpacer: {
        height: 40,
    },
});

export const GamePlayerRankstyles = StyleSheet.create({
    container: {
        ...styles.container,
    },
    header: {
        backgroundColor: color.lightBackground,
        padding: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: color.borderColor,
    },
    title: {
        fontSize: FontSize.h2,
        fontWeight: 'bold',
        color: color.valueText,
        marginBottom: Spacing.md,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: color.lightGray,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        marginLeft: Spacing.sm,
        color: color.valueText,
    },
    sortContainer: {
        backgroundColor: color.background,
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: color.borderColor,
    },
    sortLabel: {
        fontSize: 14,
        color: color.valueLabel,
        marginBottom: Spacing.sm,
    },
    sortButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: color.lightGray,
        borderRadius: Radius.sm,
        paddingVertical: 8,
        paddingHorizontal: Spacing.md,
        flex: 1,
        marginHorizontal: 4,
        justifyContent: 'center',
    },
    sortButtonActive: {
        backgroundColor: color.primary,
    },
    sortButtonText: {
        fontSize: FontSize.small,
        color: color.text,
        marginLeft: 4,
    },
    sortButtonTextActive: {
        color: color.lightText,
        fontWeight: '600',
    },
    list: {
        padding: Spacing.md,
        paddingBottom: Spacing.xl,
    },
    playerCard: {
        backgroundColor: color.lightBackground,
        borderRadius: Radius.md,
        marginBottom: Spacing.md,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    topPlayerCard: {
        borderLeftWidth: 3,
        borderLeftColor: color.card,
    },
    playerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: color.lightGray,
    },
    rankBadge: {
        width: 24,
        height: 24,
        borderRadius: Radius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
    },
    rankBadgeText: {
        fontSize: FontSize.small,
        fontWeight: 'bold',
        color: color.lightText,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: Radius.md,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: Spacing.sm,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: Radius.lg,
    },
    avatarFallback: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: Radius.lg,
    },
    avatarText: {
        fontSize: FontSize.h3,
        fontWeight: 'bold',
        color: color.lightText,
    },
    nameContainer: {
        flex: 1,
    },
    playerName: {
        fontSize: FontSize.body,
        fontWeight: '600',
        color: color.valueText,
    },
    gamesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: Spacing.xs,
    },
    gamesText: {
        fontSize: FontSize.small,
        color: color.valueLabel,
        marginLeft: Spacing.xs,
    },
    profitBadge: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.sm,
    },
    profitText: {
        fontSize: FontSize.body,
        fontWeight: 'bold',
    },
    statItem: {
        flex: 1,
        flexDirection: 'row',
    },
    statsContainer: {
        flexDirection: 'row',
        padding: Spacing.md,
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 8,
        backgroundColor: color.lightBackground,
    },
    statTexts: {
        marginLeft: Spacing.sm,
        justifyContent: 'center',
    },
    // searchInput defined earlier for GamePlayerRankstyles
    statValue: {
        fontSize: FontSize.small,
        fontWeight: '600',
        color: color.valueText,
    },
    statLabel: {
        fontSize: FontSize.small,
        color: color.valueLabel,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    loadingText: {
        marginTop: Spacing.md,
        fontSize: FontSize.small,
        color: color.valueLabel,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xxl,
        marginTop: Spacing.xxl,
    },
    emptyTitle: {
        fontSize: FontSize.h3,
        fontWeight: '600',
        color: color.valueLabel,
        marginTop: Spacing.lg,
    },
    emptyText: {
        fontSize: FontSize.body,
        color: color.weakGray,
        marginTop: Spacing.sm,
        textAlign: 'center',
    },

});

export const GamePlaystyles = StyleSheet.create({
    container: {
        flex: 1,

    },
    toolsSection: {
        backgroundColor: 'transparent',
        marginBottom: Spacing.lg,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: color.borderColor,
    },
    toolsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    toolsTitle: {
        fontSize: FontSize.small,
        fontWeight: '600',
        color: color.title,
        marginLeft: Spacing.xs,
        letterSpacing: 0.5,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: Spacing.sm,
        width: '100%',
    },
    toolButton: {
        flex: 1,
        borderRadius: Radius.md,
        overflow: 'hidden',
        shadowColor: color.shadowLight,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    toolButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.sm,
    },
    toolButtonText: {
        color: color.lightText,
        fontWeight: '700',
        fontSize: FontSize.small,
        marginLeft: Spacing.xs,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    timerButton: {},
    calculatorButton: {},
    wheelButton: {},
    statusHeader: {
        flexDirection: 'row',
        marginBottom: Spacing.md,
        alignItems: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: color.lightGray,
        paddingVertical: Spacing.xs,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.lg,
        borderWidth: 1,
        borderColor: color.borderColor,
    },
    statusText: {
        fontSize: FontSize.small,
        color: color.primary,
        fontWeight: '500',
        marginLeft: Spacing.sm,
    },
    list: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xl,
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: Spacing.xl,
    },
    analysisCard: {
        borderRadius: Radius.lg,
        backgroundColor: color.lightBackground,
        marginVertical: Spacing.lg,
        overflow: 'hidden',
        shadowColor: color.shadowLight,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.06)',
    },
    analysisHeader: {
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    },
    analysisTitle: {
        fontSize: FontSize.h2,
        fontWeight: '800',
        marginLeft: Spacing.sm,
        color: color.title,
    },
    analysisCardContainer: {
        padding: Spacing.lg,
        backgroundColor: '#FEFEFE',
    },
    analysisSectionContainer: {
        gap: Spacing.md,
    },
    endGameButton: {
        backgroundColor: color.error,
        borderRadius: Radius.md,
        height: 56,
        shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    endGameButtonText: {
        fontSize: FontSize.h3,
        fontWeight: '800',
        color: color.lightText,
        letterSpacing: 1,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    headerButton: {
        padding: Spacing.sm,
        borderRadius: Radius.sm,
    },
    summaryModal: {
        backgroundColor: color.lightBackground,
        marginHorizontal: Spacing.lg,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        elevation: Elevation.overlay,
    },
    summaryTitle: {
        fontSize: FontSize.h2,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 0.5,
        borderColor: color.weakGray,
    },
    summaryName: {
        flex: 1,
        fontWeight: '500',
    },
    summaryValue: {
        width: 80,
        textAlign: 'right',
    },
    summaryButtonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: Spacing.lg,
    },
    summaryCancelButton: {
        flex: 1,
        marginRight: Spacing.sm,
        backgroundColor: color.weakGray,
    },
    summaryConfirmButton: {
        flex: 1,
        marginLeft: Spacing.sm,
    },

});

export const GameHistorystyles = StyleSheet.create({
    container: {
        ...styles.container,
    },

    // 页面头部样式
    header: {
        paddingTop: Spacing.xl, // 状态栏高度
        paddingBottom: Spacing.lg,
        paddingHorizontal: Spacing.lg,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: FontSize.h2,
        fontWeight: '700',
        color: color.lightText,
        marginLeft: Spacing.sm,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // 统计信息样式
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.md,
    },
    statChipText: {
        fontSize: FontSize.small,
        color: 'rgba(255, 255, 255, 0.9)',
        fontWeight: '600',
        marginLeft: Spacing.xs,
    },

    // 列表和内容样式
    list: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xl,
    },
    loadingContainer: {
        ...HomePagestyles.loadingContainer,
    },
    loadingContent: {
        alignItems: 'center',
        padding: Spacing.xl,
        borderRadius: Radius.lg,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    loadingText: {
        ...HomePagestyles.loadingText,
        marginTop: Spacing.md,
        color: color.text,
        fontWeight: '600',
    },
    loadingSubText: {
        fontSize: FontSize.small,
        color: color.mutedText,
        marginTop: Spacing.xs,
        textAlign: 'center',
    },
    card: {
        borderRadius: Radius.lg,
        marginBottom: Spacing.lg,
        overflow: 'hidden',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    cardTouchable: {
        flex: 1,
        flexDirection: 'row',
    },
    cardGradient: {
        flex: 1,
        flexDirection: 'row',
    },
    dateContainer: {
        width: 80,
        padding: Spacing.md,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dateBox: {
        alignItems: 'center',
    },
    dateText: {
        fontSize: 28,
        fontWeight: '800',
        color: color.lightText,
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    dateSeparator: {
        width: 30,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        marginVertical: 4,
    },
    monthYearText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.9)',
    },
    monthText: {
        fontSize: FontSize.body,
        fontWeight: 'bold',
        color: color.strongGray,
    },
    yearText: {
        fontSize: FontSize.small,
        color: color.strongGray,
        marginTop: 2,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    timeText: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.8)',
        marginLeft: 4,
        fontWeight: '500',
    },
    cardContent: {
        flex: 1,
        padding: Spacing.md,
        paddingLeft: Spacing.lg,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    blindsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(212, 102, 19, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: 'rgba(212, 102, 19, 0.2)',
    },
    blindsText: {
        fontSize: 14,
        fontWeight: '700',
        color: color.primary,
        marginLeft: 6,
    },
    playerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(172, 189, 134, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Radius.sm,
    },
    playerCountContainer: {
        backgroundColor: color.lightBackground,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: Spacing.md,
    },
    playerCountText: {
        fontSize: 12,
        color: color.success,
        fontWeight: '600',
        marginLeft: 4,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(247, 247, 247, 0.7)',
        borderRadius: Radius.md,
        padding: Spacing.sm,
        marginBottom: Spacing.md,
        alignItems: 'center',
    },
    statCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.xs,
    },
    statDivider: {
        width: 1,
        height: 30,
        backgroundColor: 'rgba(189, 189, 189, 0.3)',
        marginHorizontal: Spacing.xs,
    },
    statItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    statTexts: {
        marginLeft: Spacing.sm,
        flex: 1,
    },
    statValue: {
        fontSize: 13,
        fontWeight: '700',
        color: color.valueText,
    },
    statLabel: {
        fontSize: 10,
        color: color.mutedText,
        marginTop: 1,
    },
    playersContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        borderRadius: Radius.sm,
        padding: Spacing.sm,
        marginBottom: Spacing.sm,
        borderWidth: 1,
        borderColor: 'rgba(224, 224, 224, 0.5)',
    },
    playerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    playerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: Spacing.sm,
    },
    winnerBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.xs,
    },
    loserBadge: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'rgba(158, 158, 158, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.xs,
    },
    playerName: {
        fontSize: 12,
        color: color.text,
        fontWeight: '500',
        flex: 1,
    },
    playerProfit: {
        fontSize: 12,
        fontWeight: '700',
    },
    cardFooter: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingRight: Spacing.xs,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
        marginTop: 60,
        borderRadius: Radius.lg,
        marginHorizontal: Spacing.lg,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(189, 189, 189, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
    },
    emptyText: {
        fontSize: 20,
        fontWeight: '700',
        color: color.text,
        marginBottom: Spacing.sm,
        textAlign: 'center',
    },
    emptySubText: {
        fontSize: 14,
        color: color.mutedText,
        marginBottom: Spacing.xl,
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyAction: {
        borderRadius: Radius.md,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    emptyActionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
    },
    emptyActionText: {
        fontSize: FontSize.body,
        fontWeight: '600',
        color: color.lightText,
        marginLeft: Spacing.xs,
    },
    footerLoader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
    },
    footerLoaderText: {
        fontSize: FontSize.small,
        color: color.mutedText,
        marginLeft: Spacing.sm,
        fontWeight: '500',
    },
    footerEnd: {
        alignItems: 'center',
        paddingVertical: Spacing.md,
    },
    footerEndText: {
        fontSize: FontSize.small,
        color: color.mutedText,
        fontStyle: 'italic',
    },
    localBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(164, 200, 225, 0.15)',
        paddingHorizontal: Spacing.xs,
        paddingVertical: 2,
        borderRadius: Radius.sm,
        marginRight: Spacing.xs,
    },
    localBadgeText: {
        fontSize: 10,
        color: color.info,
        fontWeight: '600',
        marginLeft: 2,
    },
});

// DatabaseScreen 专用样式 (继承 GameHistorystyles)
export const DatabaseStyles = StyleSheet.create({
    ...GameHistorystyles,

    // 重写头部样式以区分本地数据库
    headerTitle: {
        ...GameHistorystyles.headerTitle,
        // 可以在这里添加特殊的样式差异
    },

    // 错误处理相关样式
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        padding: Spacing.md,
        borderRadius: Radius.md,
        marginTop: Spacing.lg,
        borderWidth: 1,
        borderColor: 'rgba(244, 67, 54, 0.3)',
    },
    errorText: {
        flex: 1,
        fontSize: FontSize.small,
        color: color.error,
        marginLeft: Spacing.sm,
        marginRight: Spacing.sm,
    },
    errorButton: {
        backgroundColor: color.error,
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.sm,
    },
    errorButtonText: {
        fontSize: FontSize.small,
        color: color.lightText,
        fontWeight: '600',
    },
});

export const GameDetailstyles = StyleSheet.create({
    container: {
        ...styles.container,
    },
    scrollContent: {
        padding: 0,
        paddingBottom: 24,
    },
    notFoundContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: color.background,
    },
    notFound: {
        fontSize: 18,
        color: color.text,
        textAlign: 'center',
        marginTop: Spacing.md,
        marginBottom: 24,
    },
    backButton: {
        backgroundColor: color.card,
        paddingHorizontal: 24,
    },
    backButtonText: {
        color: '#34495e',
    },
    header: {
        backgroundColor: color.primary,
        padding: 16,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    gameInfoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateTimeContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: Radius.sm,
    },
    dateText: {
        fontSize: FontSize.body,
        fontWeight: 'bold',
        color: color.lightText,
    },
    timeText: {
        fontSize: FontSize.small,
        color: color.lightText,
        opacity: 0.9,
    },
    blindContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        paddingHorizontal: Spacing.md,
        paddingVertical: 8,
        borderRadius: Radius.sm,
    },
    blindText: {
        fontSize: FontSize.body,
        fontWeight: 'bold',
        color: color.lightText,
        marginLeft: Spacing.sm,
    },
    gameIdText: {
        fontSize: FontSize.small,
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: Spacing.md,
    },
    summaryContainer: {
        margin: 16,
        backgroundColor: color.lightText,
        borderRadius: Spacing.md,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    summaryTitle: {
        fontSize: FontSize.body,
        fontWeight: 'bold',
        color: color.text,
        marginLeft: Spacing.sm,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    statBox: {
        width: '48%',
        backgroundColor: color.lightGray,
        borderRadius: Radius.sm,
        padding: Spacing.md,
        marginBottom: Spacing.sm,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: color.valueText,
    },
    statLabel: {
        fontSize: FontSize.small,
        color: color.valueLabel,
        marginTop: 4,
    },
    exchangeRate: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ecf0f1',
        padding: 8,
        borderRadius: Radius.sm,
        marginTop: 4,
    },
    exchangeText: {
        fontSize: FontSize.small,
        color: '#34495e',
        marginLeft: Spacing.sm,
    },
    highlightsContainer: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.lg,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    highlightCard: {
        backgroundColor: color.lightText,
        borderRadius: Spacing.md,
        padding: Spacing.md,
        width: '48%',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    highlightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    highlightTitle: {
        fontSize: FontSize.small,
        fontWeight: '600',
        color: color.valueText,
        marginLeft: Spacing.xs,
    },
    highlightContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: Radius.lg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: FontSize.body,
        fontWeight: 'bold',
        color: 'white',
    },
    highlightInfo: {
        marginLeft: Spacing.sm,
        flex: 1,
    },
    highlightName: {
        fontSize: FontSize.small,
        fontWeight: '600',
        color: color.valueText,
    },
    highlightProfit: {
        fontSize: FontSize.small,
        fontWeight: 'bold',
        color: color.success,
    },
    highlightCash: {
        fontSize: FontSize.small,
        color: color.success,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.sm,
    },
    sectionTitle: {
        fontSize: FontSize.body,
        fontWeight: 'bold',
        color: color.valueText,
        marginLeft: Spacing.sm,
    },
    playerListContainer: {
        paddingHorizontal: Spacing.lg,
    },
    playerCard: {
        backgroundColor: color.lightText,
        borderRadius: Spacing.md,
        padding: Spacing.md,
        marginBottom: Spacing.md,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    playerCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.md,
    },
    playerIdentity: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    playerName: {
        marginLeft: Spacing.sm,
        fontSize: FontSize.body,
        fontWeight: '600',
        color: color.valueText,
    },

    playerStats: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: Spacing.sm,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    playerStatItem: {
        width: '45%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.xs,
        backgroundColor: color.lightGray,
        paddingHorizontal: Spacing.sm,
        gap: Spacing.sm,
        borderRadius: Radius.sm,
        marginBottom: Spacing.sm,
        marginRight: Spacing.sm,

    },
    playerStatTexts: {
        marginLeft: Spacing.sm,

    },
    playerStatValue: {
        fontSize: 14,
        fontWeight: '600',
        color: color.valueText,
    },
    playerStatLabel: {
        fontSize: 11,
        color: color.valueLabel,
    },
    playerCashResult: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        backgroundColor: color.lightGray,
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: Radius.sm,
        alignSelf: 'flex-end',
    },
    playerCashText: {
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: Spacing.sm,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: Spacing.lg,
        marginTop: 16,
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color.info,
        borderRadius: Radius.sm,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        flex: 1,
        marginRight: Spacing.sm,
        elevation: 2,
        shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
    },
    emailButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color.info,
        borderRadius: Radius.sm,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        flex: 1,
        marginLeft: Spacing.sm,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
    },
    buttonDisabled: {
        backgroundColor: color.strongGray,
        elevation: 0,
        shadowOpacity: 0,
    },
    actionButtonText: {
        fontSize: FontSize.small,
        fontWeight: '600',
        color: color.lightText,
        marginLeft: Spacing.sm,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: Spacing.xl
    },
    avatarFallback: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: Spacing.xl
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: color.overlayDark,
        justifyContent: 'center',
        padding: Spacing.lg
    },
});


export const CallTimerStyles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'transparent',
        borderRadius: Radius.xl,
        alignItems: 'center',
        elevation: 8,
        width: '85%',
        maxWidth: 340,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        overflow: 'hidden',
    },
    timeEditModalContent: {
        backgroundColor: color.lightBackground,
        padding: Spacing.lg,
    },
    closeButton: {
        position: 'absolute',
        top: Spacing.md,
        right: Spacing.md,
        zIndex: 10,
    },
    closeButtonCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },

    // 计时器样式
    timerContainer: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: Spacing.xl,
        paddingHorizontal: Spacing.lg,
    },
    timerDisplay: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    timerRing: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeDisplayCenter: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    timeText: {
        fontSize: 36,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 2,
    },
    timeUnit: {
        fontSize: FontSize.small,
        color: color.mutedText,
        fontWeight: '500',
    },
    presetContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        marginBottom: Spacing.lg,
        paddingHorizontal: Spacing.sm,
    },
    presetButton: {
        margin: Spacing.xs,
        borderRadius: Radius.md,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    presetButtonGradient: {
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 50,
    },
    activePresetButton: {
        elevation: 4,
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },
    presetButtonText: {
        color: color.text,
        fontWeight: '600',
        fontSize: FontSize.body,
    },
    activePresetButtonText: {
        color: color.lightText,
        fontWeight: '700',
    },
    controlButtons: {
        flexDirection: 'row',
        width: '100%',
        marginBottom: Spacing.lg,
        paddingHorizontal: Spacing.sm,
    },
    controlButtonWrapper: {
        flex: 1,
        marginHorizontal: Spacing.xs,
        borderRadius: Radius.md,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    controlButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        minHeight: 48,
    },
    controlButtonText: {
        color: color.lightText,
        fontWeight: '700',
        marginLeft: Spacing.xs,
        fontSize: FontSize.body,
    },
    settingsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingHorizontal: Spacing.lg,
    },
    settingButton: {
        marginHorizontal: Spacing.sm,
        borderRadius: Radius.md,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    settingButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
    },
    settingButtonText: {
        marginLeft: Spacing.xs,
        color: color.text,
        fontWeight: '600',
        fontSize: FontSize.small,
    },

    // 时间编辑样式
    timeInputContainer: {
        width: '100%',
        padding: Spacing.xl,
    },
    timeInputLabel: {
        fontSize: FontSize.h3,
        fontWeight: '700',
        marginBottom: Spacing.lg,
        textAlign: 'center',
        color: color.title,
    },
    timeInput: {
        borderWidth: 2,
        borderColor: color.primary,
        borderRadius: Radius.md,
        padding: Spacing.md,
        fontSize: FontSize.h3,
        textAlign: 'center',
        marginBottom: Spacing.lg,
        backgroundColor: color.lightBackground,
        fontWeight: '600',
    },
    timeInputButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    timeInputButton: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.xl,
        borderRadius: Radius.md,
        flex: 1,
        marginHorizontal: Spacing.xs,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    cancelButton: {
        backgroundColor: color.lightGray,
    },
    cancelButtonText: {
        color: color.text,
        fontWeight: '600',
    },
    confirmButton: {
        backgroundColor: color.success,
    },
    confirmButtonText: {
        color: color.lightText,
        fontWeight: '700',
    },

    // 加载样式
    loadingContainer: {
        padding: Spacing.xl,
        alignItems: 'center',
        backgroundColor: color.lightBackground,
        borderRadius: Radius.xl,
    },
    loadingText: {
        marginTop: Spacing.md,
        fontSize: FontSize.body,
        color: color.text,
        fontWeight: '500',
    },
});

export const BuyInCardStyles = StyleSheet.create({
    container: {
        width: '100%',
    },
    cardContainer: {
        width: '100%',
    },
    card: {
        backgroundColor: color.lightBackground,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: color.mediumGray,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: color.lightText,
    },
    headerTextContainer: {
        marginLeft: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: color.valueText,
    },
    subtitle: {
        fontSize: 14,
        color: color.valueLabel,
        marginTop: 2,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: color.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
    },
    body: {
        padding: 16,
    },
    baseChipInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        marginBottom: 12,
    },
    baseChipText: {
        fontSize: 12,
        color: color.info,
        marginLeft: 6,
        fontWeight: '500',
    },
    presetLabel: {
        fontSize: 14,
        color: color.valueLabel,
        marginBottom: 8,
    },
    quickButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 8,
    },
    quickBtn: {
        flex: 1,
        backgroundColor: color.lightGray,
        paddingHorizontal: 8,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: color.borderColor || color.mediumGray,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    quickBtnDisabled: {
        opacity: 0.6,
    },
    quickText: {
        fontSize: 12,
        fontWeight: '600',
        color: color.valueText,
    },
    quickSubtext: {
        fontSize: 10,
        color: color.mutedText,
        marginTop: 2,
    },
    currentBuyIn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: color.mediumGray,
    },
    currentBuyInLabel: {
        fontSize: 14,
        color: color.valueLabel,
    },
    currentBuyInValue: {
        fontSize: 14,
        fontWeight: '600',
        color: color.valueText,
    },
    summary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: color.lightGray,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginTop: 8,
    },
    summaryLabel: {
        fontSize: 14,
        color: color.strongGray,
    },
    summaryValue: {
        fontSize: 14,
        fontWeight: '700',
        color: color.primary,
    },
    footer: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: color.mediumGray,
        padding: 16,
    },
    cancelButton: {
        flex: 1,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: color.lightGray,
        borderRadius: 8,
        marginRight: 8,
    },
    cancelButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: color.valueLabel,
    },
    confirmButton: {
        flex: 2,
        flexDirection: 'row',
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: color.success,
        borderRadius: 8,
        marginLeft: 8,
    },
    confirmButtonDisabled: {
        backgroundColor: color.lightGray,
        opacity: 0.7,
    },
    confirmButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: color.lightText,
        marginLeft: 6,
    },
});

export const AddPlayerCardStyles = StyleSheet.create({
    container: {
        padding: 16,
    },
    card: {
        backgroundColor: color.lightBackground,
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        maxHeight: 600, // 限制最大高度，避免在小屏幕上显示不全
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: color.title,
        marginBottom: 20,
        textAlign: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
        padding: 4,
    },

    // 选项卡相关样式
    tabBar: {
        flexDirection: 'row',
        marginBottom: 20,
        borderRadius: 12,
        backgroundColor: color.lightGray,
        padding: 4,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 10,
    },
    activeTabButton: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    tabText: {
        fontSize: 8,
        fontWeight: '500',
        color: color.text,
        marginLeft: 6,
    },
    activeTabText: {
        color: color.info || '#007AFF',
    },
    tabContent: {
        minHeight: 300,
    },

    // 手动添加相关样式
    manualAddContainer: {
        marginTop: 10,
    },
    inputContainer: {
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        color: color.title,
        marginBottom: 8,
    },
    optional: {
        fontSize: 14,
        color: color.weakGray,
        fontWeight: 'normal',
    },
    input: {
        borderWidth: 1,
        borderColor: color.borderColor || color.mediumGray,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        backgroundColor: color.lightGray,
        color: color.title,
    },
    inputFocused: {
        borderColor: color.info,
        backgroundColor: color.lightBackground,
        shadowColor: color.info,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    addButton: {
        marginTop: 10,
        backgroundColor: color.confirm,
        borderRadius: 12,
        shadowColor: color.confirm,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    addButtonText: {
        color: color.lightText,
        fontWeight: '600',
    },

    // 选择玩家相关样式
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: color.lightGray,
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        paddingVertical: 12,
    },
    clearSearch: {
        padding: 4,
    },
    userList: {
        maxHeight: 300,
    },
    userItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderColor: color.mediumGray,
    },
    selectedUserItem: {
        backgroundColor: color.info,
        borderRadius: 12,
    },
    userItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: color.mediumGray,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: color.text,
    },
    userInfo: {
        flex: 1,
    },
    userNickname: {
        fontSize: 16,
        fontWeight: '500',
        color: color.title,
        marginBottom: 4,
    },
    userEmail: {
        fontSize: 14,
        color: color.text,
    },
    checkmark: {
        marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        marginTop: 12,
        color: color.text,
        fontSize: 14,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        marginTop: 12,
        color: color.text,
        fontSize: 15,
        textAlign: 'center',
    },
    emptySubText: {
        marginTop: 8,
        color: color.mutedText,
        fontSize: 13,
        textAlign: 'center',
    },
    addSelectedButton: {
        marginTop: 20,
        backgroundColor: color.confirm,
        borderRadius: 12,
    },
    addSelectedButtonText: {
        color: color.lightText,
        fontWeight: '600',
    },
    disabledButton: {
        backgroundColor: color.mediumGray,
        opacity: 0.7,
    },

    // 扫码加入相关样式
    qrContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    qrTitle: {
        fontSize: 16,
        color: color.title,
        fontWeight: '500',
        marginBottom: 20,
    },
    qrWrapper: {
        padding: 15,
        backgroundColor: color.lightBackground,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        marginBottom: 20,
    },
    copyLinkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: color.info,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginTop: 10,
    },
    copyLinkText: {
        color: color.lightText,
        fontWeight: '500',
        marginLeft: 6,
    },
    qrHelper: {
        fontSize: 14,
        color: color.text,
        textAlign: 'center',
        marginTop: 20,
        lineHeight: 20,
    },
});

export const DecisionWheelStyles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
    content: {
        flex: 1,
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    title: {
        fontSize: FontSize.h1,
        fontWeight: 'bold',
        color: color.valueText,
        textShadowColor: color.shadowLight,
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
        marginBottom: Spacing.lg,
        textAlign: 'center',
    },
    wheelContainer: {
        alignItems: 'center',
        marginVertical: Spacing.xl,
    },
    wheel: {
        width: 280,
        height: 280,
        borderRadius: 140,
        overflow: 'hidden',
        borderWidth: 6,
        borderColor: color.lightText,
        flexDirection: 'row',
        elevation: Elevation.overlay,
        shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        position: 'relative',
    },
    half: {
        width: '50%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    leftHalf: {
        // Gradient applied inline
    },
    rightHalf: {
        // Gradient applied inline  
    },
    optionText: {
        fontSize: FontSize.h2,
        color: color.lightText,
        fontWeight: 'bold',
        textShadowColor: color.shadowDark,
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    wheelCenter: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 70,
        height: 70,
        marginLeft: -35,
        marginTop: -35,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: Elevation.card,
        borderWidth: 3,
        borderColor: color.lightText,
    },
    arrowContainer: {
        position: 'absolute',
        top: -30,
        elevation: Elevation.overlay,
        shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
    },
    closeButton: {
        position: 'absolute',
        top: 50,
        right: Spacing.xl,
        zIndex: 10,
        backgroundColor: color.shadowDark,
        borderRadius: Radius.xl,
        padding: Spacing.md,
        elevation: Elevation.card,
    },
    buttonContainer: {
        width: '100%',
        alignItems: 'center',
        marginTop: Spacing.xl,
    },
    button: {
        borderRadius: Radius.xl,
        elevation: Elevation.card,
        shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    spinButton: {
        minWidth: 200,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.xl,
    },
    buttonText: {
        color: color.lightText,
        fontWeight: 'bold',
        fontSize: FontSize.body,
        marginLeft: Spacing.sm,
    },
    resultContainer: {
        marginTop: Spacing.xl,
        width: '85%',
        borderRadius: Radius.lg,
        overflow: 'hidden',
        elevation: Elevation.overlay,
        shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        borderWidth: 2,
        borderColor: color.lightText,
    },
    resultGradient: {
        paddingVertical: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
    },
    decisionResult: {
        fontSize: FontSize.h3,
        fontWeight: '600',
        color: color.valueText,
        marginBottom: Spacing.sm,
    },
    decisionText: {
        fontSize: 42,
        fontWeight: 'bold',
        color: color.valueText,
        textShadowColor: color.shadowLight,
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    }
});

export const ExitBuyInStyles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: color.overlayDark,
    },
    card: {
        backgroundColor: color.lightBackground,
        borderRadius: 16,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: color.valueText,
    },
    label: {
        fontSize: 14,
        color: color.valueLabel,
        marginBottom: 12,
    },
    inputContainer: {
        marginBottom: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: color.borderColor || color.mediumGray,
        borderRadius: 8,
        padding: 10,
        fontSize: 16,
        color: color.valueText,
        backgroundColor: color.lightGray,
    },
    inputFocused: {
        borderColor: color.highLighter,
        backgroundColor: color.lightBackground,
    },
    button: {
        backgroundColor: color.success,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: color.lightText,
    },
});

export const GameSetUpStyles = StyleSheet.create({
    keyboardAvoid: {
        flex: 1,
        justifyContent: 'center',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: Spacing.xl,
    },
    card: {
        marginHorizontal: Spacing.xl,
        borderRadius: Radius.lg,
        backgroundColor: color.lightBackground,
        shadowColor: color.shadowLight,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        overflow: 'hidden',
    },
    headerGradient: {
        paddingVertical: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.2)',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    title: {
        fontSize: FontSize.h1,
        fontWeight: '800',
        color: color.lightText,
        textAlign: 'center',
        marginBottom: Spacing.xs,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    subtitle: {
        fontSize: FontSize.body,
        color: 'rgba(255, 255, 255, 0.9)',
        textAlign: 'center',
        fontWeight: '500',
    },
    formSection: {
        padding: Spacing.lg,
    },
    sectionContainer: {
        marginBottom: Spacing.xs,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        backgroundColor: color.lightGray,
        borderRadius: Radius.sm,
    },
    sectionTitle: {
        fontSize: FontSize.h3,
        fontWeight: '700',
        color: color.title,
        marginLeft: Spacing.sm,
    },
    inputRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: -Spacing.xs,
    },
    halfWidth: {
        flex: 1,
        marginHorizontal: Spacing.xs,
    },
    buttonSection: {
        padding: Spacing.lg,
        backgroundColor: color.lightGray,
        borderTopWidth: 1,
        borderTopColor: color.borderColor,
    },
    buttonGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cancelButton: {
        borderColor: color.mutedText,
        backgroundColor: 'transparent',
        flex: 1,
        marginRight: Spacing.md,
    },
    confirmButton: {
        backgroundColor: color.success,
        flex: 2,
        shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    // Legacy styles for backward compatibility
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
});

export const InfoRowStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 6,
        paddingHorizontal: 12,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Palette.lightBackground,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    text: {
        fontSize: 16,
        fontWeight: '500',
    },
    label: {
        fontSize: 12,
        fontWeight: '400',
        marginBottom: 2,
    },
});

export const LogViewerStyles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        right: 10,
        height: 500,
        backgroundColor: color.lightBackground,
        borderRadius: 12,
        padding: 10,
        zIndex: 9999,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    title: {
        color: Palette.lightText,
        fontWeight: 'bold',
        fontSize: 16,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    clear: {
        color: Palette.error,
        fontWeight: '600',
        fontSize: 13,
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    filterLabel: {
        color: Palette.weakGray,
        fontSize: 12,
        marginRight: 4,
    },
    filterTag: {
        fontSize: 12,
        color: Palette.loadingText,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        backgroundColor: Palette.darkGray,
    },
    filterActive: {
        backgroundColor: Palette.info,
        color: Palette.lightText,
    },
    logList: {
        paddingBottom: 4,
    },
    logItem: {
        color: Palette.text,
        fontSize: 12,
        marginBottom: 4,
    },
    tag: {
        color: Palette.info,
    },
    emoji: {
        marginRight: 4,
    },
});


export const MessageStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: color.overlayDark,
        justifyContent: 'center',
        alignItems: 'center',
    },
    popup: {
        backgroundColor: color.lightBackground,
        borderRadius: 14, // 增加圆角
        shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 10, // 增强Android阴影效果
        width: '85%',
        maxWidth: 400,
        overflow: 'hidden',
    },
    titleContainer: {
        paddingVertical: 18,
        paddingHorizontal: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        color: color.title,
    },
    warningTitle: { color: color.error },
    divider: { height: 1, backgroundColor: color.mediumGray, width: '100%' },
    messageContainer: {
        paddingVertical: 24,
        paddingHorizontal: 24,
    },
    text: { fontSize: 16, lineHeight: 24, textAlign: 'center', color: color.strongGray },
    noteContainer: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    note: { fontSize: 14, lineHeight: 20, textAlign: 'center', color: color.text },
    noteLabel: { fontWeight: 'bold', color: color.error },
    buttonContainer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: color.mediumGray },
    button: {
        flex: 1,
        paddingVertical: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelButton: { backgroundColor: color.lightBackground, borderRightWidth: 0.5, borderRightColor: color.mediumGray },
    confirmButton: { backgroundColor: color.lightBackground, borderLeftWidth: 0.5, borderLeftColor: color.mediumGray },
    warningButton: { backgroundColor: color.lightBackground, borderLeftWidth: 0.5, borderLeftColor: color.mediumGray },
    cancelButtonText: { fontSize: 16, fontWeight: '600', color: color.mutedText },
    confirmButtonText: { fontSize: 16, fontWeight: '600', color: color.confirm },
    warningButtonText: { color: color.cancel },
});

export const PlayerCardStyles = StyleSheet.create({
    touchableWrapper: {
        marginVertical: Spacing.sm,
    },
    cardWrapperPressed: {
        opacity: 0.95,
        transform: [{ scale: 0.98 }],
    },
    card: {
        borderRadius: Radius.lg,
        overflow: 'hidden',
        elevation: Elevation.card,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        marginHorizontal: Spacing.xs,
    },

    // 主要内容容器
    cardContent: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)', // 半透明白色覆盖层
        flex: 1,
    },

    // 卡片头部重新设计
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0, 0, 0, 0.1)',
    },

    // 玩家信息区域
    playerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    nameAndStatus: {
        marginLeft: Spacing.md,
        flex: 1,
    },
    playerName: {
        fontSize: FontSize.h3,
        fontWeight: '700',
        color: color.title,
        marginBottom: Spacing.xs,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.sm,
        alignSelf: 'flex-start',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: Spacing.xs,
    },
    statusText: {
        fontSize: FontSize.small,
        fontWeight: '600',
        color: color.text,
    },

    // 盈亏徽章
    profitBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: Radius.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    profitText: {
        fontSize: FontSize.body,
        fontWeight: '700',
        color: color.lightText,
        marginLeft: Spacing.xs,
    },

    // 头像样式优化
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.8)',
    },
    avatarFallback: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 26,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 23,
    },
    avatarText: {
        fontSize: FontSize.h2,
        fontWeight: 'bold',
        color: color.lightText,
    },

    // 详情区域优化
    detailsContainer: {
        padding: Spacing.lg,
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    detailItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        padding: Spacing.md,
        borderRadius: Radius.md,
        marginHorizontal: Spacing.xs,
        minHeight: 64,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.5)',
    },
    detailTexts: {
        marginLeft: Spacing.md,
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    detailValue: {
        fontSize: FontSize.h3,
        fontWeight: '700',
        color: color.valueText,
        marginBottom: 2,
    },
    detailLabel: {
        fontSize: FontSize.small,
        color: color.mutedText,
        fontWeight: '500',
    },

    // 操作区域优化
    actions: {
        flexDirection: 'row',
        padding: Spacing.lg,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(0, 0, 0, 0.1)',
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        gap: Spacing.md,
    },
    buyinButton: {
        flex: 1,
        backgroundColor: color.success,
        borderRadius: Radius.md,
        minHeight: 48,
        shadowColor: color.success,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    leaveButton: {
        flex: 1,
        backgroundColor: color.error,
        borderRadius: Radius.md,
        minHeight: 48,
        shadowColor: color.error,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    returnButton: {
        flex: 1,
        backgroundColor: color.info,
        borderRadius: Radius.md,
        minHeight: 48,
        shadowColor: color.info,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    leaveText: {
        fontSize: FontSize.body,
        fontWeight: '700',
        color: color.lightText,
    },
    buyinText: {
        fontSize: FontSize.body,
        fontWeight: '700',
        color: color.lightText,
    },
    disabledButton: {
        opacity: 0.5,
    },

    // 详情图标按钮
    detailIconButton: {
        padding: Spacing.sm,
        borderRadius: Radius.sm,
        backgroundColor: color.lightBackground,
        marginLeft: Spacing.sm,
        borderWidth: 1,
        borderColor: color.borderColor,
    },

    // 弹窗样式
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    modalContainer: {
        backgroundColor: color.background,
        borderRadius: Radius.lg,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        shadowColor: color.strongGray,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 12,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: color.borderColor,
        backgroundColor: color.lightBackground,
    },
    modalHeaderContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    modalAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: Spacing.md,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    modalAvatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
    },
    modalAvatarFallback: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalAvatarText: {
        fontSize: FontSize.h2,
        fontWeight: 'bold',
        color: color.lightText,
    },
    modalStatusIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: color.background,
    },
    modalTitleSection: {
        flex: 1,
    },
    modalTitle: {
        fontSize: FontSize.h2,
        fontWeight: '700',
        color: color.title,
        marginBottom: Spacing.xs,
    },
    modalSubtitle: {
        fontSize: FontSize.body,
        color: color.mutedText,
        fontWeight: '500',
    },
    modalCloseButton: {
        padding: Spacing.sm,
        borderRadius: Radius.sm,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    modalContent: {
        padding: Spacing.lg,
        backgroundColor: color.lightBackground,
    },
    modalSection: {
        marginBottom: Spacing.lg,
    },
    modalSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.md,
        paddingBottom: Spacing.xs,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: color.borderColor,
    },
    modalSectionTitle: {
        fontSize: FontSize.body,
        fontWeight: '600',
        color: color.title,
        marginLeft: Spacing.sm,
    },
    modalStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
        gap: Spacing.sm,
    },
    modalStatCard: {
        flex: 1,
        backgroundColor: color.lightBackground,
        borderRadius: Radius.md,
        padding: Spacing.md,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: color.borderColor,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    modalStatValue: {
        fontSize: FontSize.h3,
        fontWeight: '700',
        color: color.title,
        marginVertical: Spacing.xs,
    },
    modalStatLabel: {
        fontSize: FontSize.small,
        color: color.mutedText,
        textAlign: 'center',
        fontWeight: '500',
    },
    modalInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    modalInfoLabel: {
        fontSize: FontSize.body,
        color: color.text,
        marginLeft: Spacing.sm,
        minWidth: 80,
    },
    modalInfoValue: {
        fontSize: FontSize.body,
        fontWeight: '500',
        color: color.valueText,
        flex: 1,
    },
    buyInHistory: {
        marginTop: Spacing.sm,
        paddingLeft: Spacing.lg,
    },
    buyInHistoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    buyInHistoryTitle: {
        fontSize: FontSize.small,
        fontWeight: '600',
        color: color.mutedText,
        marginLeft: Spacing.xs,
    },
    buyInHistoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        backgroundColor: color.lightBackground,
        borderRadius: Radius.sm,
        marginBottom: Spacing.xs,
        borderWidth: 1,
        borderColor: color.borderColor,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    buyInHistoryLeft: {
        flex: 1,
    },
    buyInHistoryTag: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    buyInHistoryIndex: {
        fontSize: FontSize.small,
        fontWeight: '600',
        color: color.title,
        marginLeft: Spacing.xs,
    },
    buyInHistoryTime: {
        fontSize: FontSize.small - 1,
        color: color.mutedText,
    },
    buyInHistoryRight: {
        alignItems: 'flex-end',
    },
    buyInHistoryAmount: {
        fontSize: FontSize.h3,
        fontWeight: '700',
        color: color.highLighter,
    },
    buyInHistoryUnit: {
        fontSize: FontSize.small,
        color: color.mutedText,
        marginTop: 2,
    },
});

export const ButtonStyles = StyleSheet.create({
    button: {
        borderRadius: Button.radius,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        overflow: 'hidden', // 确保涟漪效果不会超出按钮边界
    },
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontWeight: '600',
        textAlign: 'center',
    },
    iconLeft: {
        marginRight: 8,
    },
    iconRight: {
        marginLeft: 8,
    },
    // 按压效果
    buttonPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.98 }]
    },
    // 变体样式
    filledButton: {
        backgroundColor: color.primary,
        borderWidth: 0,
        shadowColor: color.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    outlinedButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: color.primary,
    },
    textButton: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        paddingHorizontal: 8,
    },
    // 尺寸样式
    smallButton: {
        paddingVertical: Math.max(6, Button.paddingVertical - 8),
        paddingHorizontal: Spacing.md,
        minHeight: 32,
    },
    mediumButton: {
        paddingVertical: Math.max(8, Button.paddingVertical - 4),
        paddingHorizontal: Spacing.lg,
        minHeight: 40,
    },
    largeButton: {
        paddingVertical: Button.paddingVertical,
        paddingHorizontal: Spacing.xl,
        minHeight: 48,
    },
    // 文字尺寸
    smallText: {
        fontSize: FontSize.small,
    },
    mediumText: {
        fontSize: FontSize.body,
    },
    largeText: {
        fontSize: FontSize.h3,
    },
    // 文字颜色
    lightText: { color: color.lightText },
    darkText: { color: color.primary },
    // 禁用状态
    disabledButton: {
        backgroundColor: color.lightGray,
        borderColor: color.mediumGray,
        opacity: 0.7,
        shadowOpacity: 0,
        elevation: 0,
    },
    disabledText: {
        color: color.mutedText,
    },
    // 圆角样式
    rounded: {
        borderRadius: Radius.round,
    },
    // 满宽样式
    fullWidth: {
        width: '100%',
    },
    // 加载状态
    loader: {
        marginRight: 0,
    }
});

export const SettleChipsStyles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        borderRadius: Radius.lg,
        padding: Spacing.xl,
        width: '100%',
        maxWidth: 400,
        elevation: Elevation.overlay,
        shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xl,
    },
    headerIcon: {
        marginBottom: Spacing.sm,
    },
    title: {
        fontSize: FontSize.h2,
        fontWeight: '700',
        marginBottom: Spacing.xs,
        color: color.valueText,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: FontSize.body,
        color: color.text,
        textAlign: 'center',
    },
    playerName: {
        fontWeight: '600',
        color: color.primary,
    },
    inputSection: {
        marginBottom: Spacing.xl,
    },
    inputLabel: {
        fontSize: FontSize.body,
        fontWeight: '500',
        color: color.valueText,
        marginBottom: Spacing.sm,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: color.mediumGray,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        backgroundColor: color.lightBackground,
        marginBottom: Spacing.sm,
    },
    inputError: {
        borderColor: color.error,
    },
    inputIcon: {
        marginRight: Spacing.sm,
    },
    input: {
        flex: 1,
        paddingVertical: Spacing.lg,
        fontSize: FontSize.h3,
        textAlign: 'center',
        color: color.valueText,
        fontWeight: '600',
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    errorText: {
        fontSize: FontSize.small,
        color: color.error,
        marginLeft: Spacing.xs,
        flex: 1,
    },
    quickAmountLabel: {
        fontSize: FontSize.small,
        fontWeight: '500',
        color: color.text,
        marginBottom: Spacing.sm,
        marginTop: Spacing.sm,
    },
    quickAmountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: Spacing.lg,
    },
    quickAmountButton: {
        flex: 1,
        marginHorizontal: Spacing.xs,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.sm,
        borderWidth: 1,
        borderColor: color.mediumGray,
        backgroundColor: color.lightBackground,
        alignItems: 'center',
    },
    quickAmountButtonSelected: {
        borderColor: color.primary,
        backgroundColor: color.primary,
    },
    quickAmountText: {
        fontSize: FontSize.small,
        fontWeight: '500',
        color: color.text,
    },
    quickAmountTextSelected: {
        color: color.lightText,
        fontWeight: '600',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    button: {
        flex: 1,
        borderRadius: Radius.md,
        elevation: Elevation.card,
        shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        overflow: 'hidden',
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.md,
    },
    cancelButton: {
        // Style handled by gradient
    },
    confirmButton: {
        // Style handled by gradient
    },
    cancelButtonText: {
        fontSize: FontSize.body,
        fontWeight: '600',
        color: color.strongGray,
        marginLeft: Spacing.xs,
    },
    confirmButtonText: {
        fontSize: FontSize.body,
        fontWeight: '600',
        color: color.lightText,
        marginLeft: Spacing.xs,
    },
});


// SettleSummaryModal 专用样式
export const modalStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: color.overlayDark,
    },
    modal: {
        backgroundColor: color.lightBackground,
        marginHorizontal: Spacing.lg,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        elevation: Elevation.overlay,
        shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        maxHeight: maxModalHeight,
        flex: 0, // 防止过度拉伸
    },
    header: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        marginBottom: Spacing.lg,
        paddingBottom: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: color.mediumGray,
    },
    headerTitle: {
        fontSize: FontSize.h2,
        fontWeight: '700' as const,
        color: color.valueText,
    },
    playersBadge: {
        backgroundColor: color.info + '20',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderRadius: Radius.sm,
    },
    currencySection: {
        marginBottom: Spacing.md,
        padding: Spacing.sm, // 减少padding从md到sm
        backgroundColor: color.lightBackground,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: color.borderColor || color.mediumGray,
    },
    currencySwitch: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        marginBottom: Spacing.xs, // 减少margin从sm到xs
    },
    currencyLabel: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
    },
    currencyLabelText: {
        fontSize: FontSize.small, // 减少字体大小从body到small
        fontWeight: '500' as const, // 减少字重从600到500
        color: color.valueText,
    },
    exchangeRateSection: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        paddingTop: Spacing.xs, // 减少padding从sm到xs
        borderTopWidth: 1,
        borderTopColor: color.borderColor || color.mediumGray,
    },
    exchangeRateLabel: {
        fontSize: FontSize.small - 1, // 更小的字体
        color: color.text,
        marginRight: Spacing.xs,
    },
    flatListContainer: {
        maxHeight: maxModalHeight * 0.5, // 减少FlatList高度为50%
        flexGrow: 0,
    },
    playerItem: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        marginVertical: Spacing.xs,
        backgroundColor: color.lightGray,
        borderRadius: Radius.md,
        elevation: 1,
        shadowColor: color.shadowLight,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    summarySection: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingTop: Spacing.md, // 减少垂直padding
        paddingHorizontal: Spacing.md,
        marginTop: Spacing.sm, // 减少顶部margin
        borderTopWidth: 1,
        borderTopColor: color.mediumGray,
        backgroundColor: color.lightBackground, // 更浅的背景色
        borderRadius: Radius.sm, // 更小的圆角
    },
    summaryText: {
        fontWeight: '600' as const, // 减少字重
        fontSize: FontSize.body, // 减少字体大小
        color: color.valueText,
    },
    summarySubText: {
        fontSize: FontSize.small,
        color: color.text,
        marginTop: 2,
    },
    totalAmountContainer: {
        paddingVertical: Spacing.xs, // 减少padding
        paddingHorizontal: Spacing.sm,
        borderRadius: Radius.sm,
        elevation: 1, // 减少阴影
        shadowColor: color.shadowDark,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
    },
    totalAmountText: {
        color: 'white',
        fontWeight: '600' as const, // 减少字重
        fontSize: FontSize.small, // 减少字体大小
        marginLeft: 4,
    },
    buttonsContainer: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        marginTop: Spacing.md, // 减少顶部margin
        paddingTop: Spacing.md, // 减少顶部padding
        borderTopWidth: 1,
        borderTopColor: color.mediumGray,
    },
});



export default styles;