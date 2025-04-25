import { StyleSheet } from 'react-native';
import { Palette as color } from '@/constants';


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: color.background,
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
    keyboardAvoidingView: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logoPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: color.card,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoText: {
        color: 'white',
        fontWeight: 'bold',
    },
    formContainer: {
        backgroundColor: color.lightGray,
        borderRadius: 20,
        padding: 20,
        shadowColor: color.darkGray,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        
        borderWidth: 1,
        borderColor: color.borderColor,
        borderRadius: 12,
        marginBottom: 16,
        paddingHorizontal: 15,
        paddingVertical: 12,
        alignItems: 'center',
        backgroundColor: color.lightGray,
    },
    inputIcon: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: color.text,
    },
    eyeIcon: {
        padding: 4,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 8,
        marginBottom: 16,
    },
    error: {
        color: color.error,
        marginLeft: 6,
        fontSize: 14,
    },
    loginButton: {
        backgroundColor: color.card,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        marginBottom: 20,
    },
});

export const HomePagestyles = StyleSheet.create({
    container: {
        ...styles.container,
    },
    contentContainer: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    loadingContainer: {
        ...styles.container,
        alignItems: 'center',
        justifyContent: 'center',

    },
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        color: color.loadingText,
    },
    headerSection: {
        width: '100%',
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 40,
    },
    buttonsSection: {
        width: '100%',
        alignItems: 'center',
        marginBottom: 40,
    },
    footerSection: {
        width: '100%',
        alignItems: 'center',
        marginTop: 20,
        bottom: 20,
        position: 'absolute',
    },
    icon: {
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: color.title,
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: color.mutedText,
        marginBottom: 32,
        textAlign: 'center',
    },
    startGameButton: {
        marginBottom: 24,
        backgroundColor: color.success,
    },
    buttonRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    secondaryButton: {
        width: '48%',
        borderColor: color.info,
    },

    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    footerText: {
        fontSize: 12,
        color: '#95a5a6',
        textAlign: 'center',
    },
});

export const GamePlayerRankstyles = StyleSheet.create({
    container: {
        ...styles.container,
    },
    header: {
        backgroundColor: color.lightBackground,
        padding: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: color.borderColor,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: color.valueText,
        marginBottom: 12,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f6fa',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        marginLeft: 8,
        color: '#34495e',
    },
    sortContainer: {
        backgroundColor: color.background,
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: color.borderColor,
    },
    sortLabel: {
        fontSize: 14,
        color: color.valueLabel,
        marginBottom: 8,
    },
    sortButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        flex: 1,
        marginHorizontal: 4,
        justifyContent: 'center',
    },
    sortButtonActive: {
        backgroundColor: color.primary,
    },
    sortButtonText: {
        fontSize: 12,
        color: '#666666',
        marginLeft: 4,
    },
    sortButtonTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    list: {
        padding: 12,
        paddingBottom: 24,
    },
    playerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    topPlayerCard: {
        borderLeftWidth: 3,
        borderLeftColor: '#FFD700',
    },
    playerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    rankBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    rankBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 18,
    },
    avatarFallback: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 18,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
    },
    nameContainer: {
        flex: 1,
    },
    playerName: {
        fontSize: 16,
        fontWeight: '600',
        color: color.valueText,
    },
    gamesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    gamesText: {
        fontSize: 12,
        color: color.valueLabel,
        marginLeft: 4,
    },
    profitBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    profitText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#f8f9fa',
    },
    statItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
    },
    statTexts: {
        marginLeft: 6,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: color.valueText,
    },
    statLabel: {
        fontSize: 11,
        color: color.valueLabel,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: color.valueLabel,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        marginTop: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: color.valueLabel,
        marginTop: 16,
    },
    emptyText: {
        fontSize: 14,
        color: '#95a5a6',
        marginTop: 8,
        textAlign: 'center',
    },
});

export const GamePlaystyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
        padding: 16,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
        width: '100%',
    },
    toolButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3a7bd5',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 10,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    toolButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 5,
    },
    statusHeader: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'center',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e6effd',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#d0e1f9',
    },
    statusText: {
        fontSize: 14,
        color: '#3a7bd5',
        fontWeight: '500',
        marginLeft: 6,
    },
    list: {
        gap: 16,
        paddingBottom: 24,
    },
    overlay: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 20,
    },
    analysisCard: {
        borderRadius: 16,
        backgroundColor: '#fff',
        marginVertical: 16,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    analysisHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eaeaea',
    },
    analysisTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
        color: '#333',
    },
    analysisCardContainer: {
        padding: 16,
    },
    analysisSectionContainer: {
        gap: 12,
    },
    analysisDivider: {
        height: 1,
        backgroundColor: '#eaeaea',
        marginVertical: 16,
    },
    endGameButton: {
        backgroundColor: '#E53935',
        borderRadius: 12,
        marginBottom: 24,
        height: 54,
        shadowColor: 'rgba(229, 57, 53, 0.3)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    endGameButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    headerButton: {
        padding: 6,
        borderRadius: 8,
    }
});

export const GameHistorystyles = StyleSheet.create({
    container: {
        ...styles.container,
    },
    list: {
        padding: 16,
        paddingBottom: 24,
    },
    loadingContainer: {
        ...HomePagestyles.loadingContainer,
    },
    loadingText: {
        ...HomePagestyles.loadingText
    },
    card: {
        backgroundColor: color.mediumGray,
        borderRadius: 16,
        marginBottom: 16,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        flexDirection: 'row',
    },
    dateContainer: {
        width: 70,
        backgroundColor: color.weakGray,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 1,
        borderRightColor: color.borderColor,
    },
    dateBox: {
        alignItems: 'center',
    },
    dateText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: color.strongGray,
    },
    monthText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: color.strongGray,
    },
    yearText: {
        fontSize: 12,
        color: color.strongGray,
        marginTop: 2,
    },
    timeText: {
        fontSize: 12,
        color: color.strongGray,
        marginTop: 8,
    },
    cardContent: {
        flex: 1,
        padding: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    blindsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    blindsText: {
        fontSize: 14,
        fontWeight: '600',
        color: color.valueText,
        marginLeft: 4,
    },
    playerCountContainer: {
        backgroundColor: '#f1f8e9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    playerCountText: {
        fontSize: 13,
        color: '#558b2f',
        fontWeight: '500',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor:color.lightGray,
        borderRadius: 12,
        padding: 8,
        marginBottom: 12,
    },
    statItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    statTexts: {
        marginLeft: 6,
    },
    statValue: {
        fontSize: 14,
        fontWeight: '600',
        color: color.valueText,
    },
    statLabel: {
        fontSize: 11,
        color: color.valueLabel,
    },
    playersContainer: {
        backgroundColor: color.lightGray,
        borderRadius: 12,
        padding: 10,
        marginBottom: 8,
    },
    playerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    playerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    playerName: {
        fontSize: 13,
        color: color.valueText,
        marginLeft: 6,
    },
    playerProfit: {
        fontSize: 13,
        fontWeight: '600',
    },
    cardFooter: {
        alignItems: 'flex-end',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#757575',
        marginTop: 16,
    },
    emptySubText: {
        fontSize: 14,
        color: '#9E9E9E',
        marginTop: 8,
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
        marginTop: 12,
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
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    dateText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: color.lightText,
    },
    timeText: {
        fontSize: 12,
        color: color.lightText,
        opacity: 0.9,
    },
    blindContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    blindText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: color.lightText,
        marginLeft: 6,
    },
    gameIdText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
        marginTop: 8,
    },
    summaryContainer: {
        margin: 16,
        backgroundColor: color.lightText,
        borderRadius: 12,
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
        marginBottom: 12,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: color.text,
        marginLeft: 6,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    statBox: {
        width: '48%',
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: color.valueText,
    },
    statLabel: {
        fontSize: 12,
        color: color.valueLabel,
        marginTop: 4,
    },
    exchangeRate: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ecf0f1',
        padding: 8,
        borderRadius: 6,
        marginTop: 4,
    },
    exchangeText: {
        fontSize: 12,
        color: '#34495e',
        marginLeft: 6,
    },
    highlightsContainer: {
        marginHorizontal: 16,
        marginBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    highlightCard: {
        backgroundColor: color.lightText,
        borderRadius: 12,
        padding: 12,
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
        marginBottom: 8,
    },
    highlightTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: color.valueText,
        marginLeft: 4,
    },
    highlightContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    highlightInfo: {
        marginLeft: 8,
        flex: 1,
    },
    highlightName: {
        fontSize: 12,
        fontWeight: '600',
        color: color.valueText,
    },
    highlightProfit: {
        fontSize: 14,
        fontWeight: 'bold',
        color: color.success,
    },
    highlightCash: {
        fontSize: 12,
        color: color.success,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 16,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: color.valueText,
        marginLeft: 6,
    },
    playerListContainer: {
        paddingHorizontal: 16,
    },
    playerCard: {
        backgroundColor: color.lightText,
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
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
        marginBottom: 10,
    },
    playerIdentity: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    playerName: {
        marginLeft: 8,
        fontSize: 16,
        fontWeight: '600',
        color: color.valueText,
    },
    profitBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    profitText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    playerStats: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 8,
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    playerStatItem: {
        width: '45%',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        backgroundColor: '#ecf0f1',
        paddingHorizontal: 8,
        gap: 6,
        borderRadius: 6,
        marginBottom: 8,
        marginRight: 8,

    },
    playerStatTexts: {
        marginLeft: 6,

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
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-end',
    },
    playerCashText: {
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 6,
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginTop: 16,
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color.info,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flex: 1,
        marginRight: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
    },
    emailButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: color.info,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flex: 1,
        marginLeft: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.5,
    },
    buttonDisabled: {
        backgroundColor: '#95a5a6',
        elevation: 0,
        shadowOpacity: 0,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: color.lightText,
        marginLeft: 6,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 20
    },
    avatarFallback: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        padding: 20
    },
});
export default styles;