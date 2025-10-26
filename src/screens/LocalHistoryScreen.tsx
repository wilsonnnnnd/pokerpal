import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette as color } from '@/constants';
import { Spacing, Radius, FontSize } from '@/constants/designTokens';
import { GameHistorystyles as styles, DatabaseStyles } from '@/assets/styles';
import simpleT from '@/i18n/simpleT';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GameCard } from '@/components/GameCard';
import gameHistoryService from '@/services/gameHistoryService';
import { usePageState } from '@/hooks/usePageState';
import { PageStateView } from '@/components/PageState';

export default function LocalhistoryScreen() {
	const pageState = usePageState();
	const [items, setItems] = useState<any[]>([]);
	const nav = useNavigation();

	const load = async () => {
		pageState.setError(null);
		pageState.setLoading(true);
		try {
			const result = await gameHistoryService.loadGameHistory();
			setItems(result.historyItems);
			if (result.error) {
				pageState.setError(result.error);
			}
		} catch (e: any) {
			console.warn('load db error', e);
			pageState.setError(e?.message ?? String(e));
			setItems([]);
		} finally {
			pageState.setLoading(false);
		}
	};

	useEffect(() => { load(); }, []);

	// 下拉刷新
	const onRefresh = useCallback(async () => {
		pageState.setRefreshing(true);
		await load();
		pageState.setRefreshing(false);
	}, []); // 移除 pageState 依赖

	const renderItem = ({ item, index }: { item: any; index: number }) => {
		// 适配本地数据格式：item.__history 包含实际的历史记录数据
		const historyData = item.__history;
		if (!historyData) return null;

		return (
			<GameCard
				item={historyData}
				index={index}
				onPress={(selectedItem) => {
					(nav as any).navigate('GameDetail', { game: selectedItem, isLocal: true });
				}}
			/>
		);
	};

	// 处理重试
	const handleRetry = useCallback(() => {
		load();
	}, []);

	// 检查是否本地数据库不可用
	if (!gameHistoryService.hasLocalDb) {
		return (
			<PageStateView
				loading={false}
				error={simpleT('local_db_unavailable')}
				onRetry={handleRetry}
			>
				<></>
			</PageStateView>
		);
	}

	return (
		<PageStateView
			loading={pageState.loading}
			error={pageState.error}
        		isEmpty={!pageState.loading && !pageState.error && items.length === 0}
        		emptyTitle={simpleT('local_history_empty_title')}
        		emptySubtitle={simpleT('local_history_empty_subtitle')}
			onRetry={handleRetry}
		>
			<LinearGradient
				colors={[color.background, color.lightBackground]}
				style={styles.container}
			>
				{/* 页面头部 */}
				<LinearGradient
					colors={[color.primary, color.primary]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
					style={DatabaseStyles.header}
				>
					<View style={DatabaseStyles.headerContent}>
						<View style={DatabaseStyles.headerLeft}>
							<MaterialCommunityIcons name="database" size={24} color={color.lightText} />
							<Text style={DatabaseStyles.headerTitle}>{simpleT('local_db_title')}</Text>
						</View>
						<View style={DatabaseStyles.headerRight}>
							<TouchableOpacity
								style={DatabaseStyles.headerButton}
								onPress={onRefresh}
								activeOpacity={0.7}
							>
								<MaterialCommunityIcons name="refresh" size={20} color={color.lightText} />
							</TouchableOpacity>
							{pageState.error && (
								<TouchableOpacity
									style={[DatabaseStyles.headerButton, { marginLeft: Spacing.xs }]}
									onPress={() => Alert.alert(simpleT('error_details'), pageState.error || simpleT('unknown_error'))}
									activeOpacity={0.7}
								>
									<MaterialCommunityIcons name="alert-circle" size={20} color="#FFE57F" />
								</TouchableOpacity>
							)}
						</View>
					</View>
					
					{/* 统计信息 */}
					<View style={DatabaseStyles.statsRow}>
						<View style={DatabaseStyles.statChip}>
							<MaterialCommunityIcons name="file-document" size={16} color="rgba(255, 255, 255, 0.8)" />
							<Text style={DatabaseStyles.statChipText}>{simpleT('records_count', undefined, { count: items.length })}</Text>
						</View>
					</View>
				</LinearGradient>

				<FlatList
					data={items}
					keyExtractor={(item) => String(item.id)}
					contentContainerStyle={styles.list}
					renderItem={renderItem}
					refreshControl={
						<RefreshControl 
							refreshing={pageState.refreshing || false} 
							onRefresh={onRefresh}
							colors={[color.info]}
							tintColor={color.info}
						/>
					}
					showsVerticalScrollIndicator={false}
				/>
			</LinearGradient>
		</PageStateView>
	);
}
