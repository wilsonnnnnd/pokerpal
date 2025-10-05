import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette as color } from '@/constants';
import { Spacing, Radius, FontSize } from '@/constants/designTokens';
import { GameHistorystyles as styles, DatabaseStyles } from '@/assets/styles';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LocalGameCard } from '@/components/LocalGameCard';
import gameHistoryService from '@/services/gameHistoryService';

export default function LocalhistoryScreen() {
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [items, setItems] = useState<any[]>([]);
	const [error, setError] = useState<string | null>(null);
	const nav = useNavigation();

	const load = async () => {
		setError(null);
		setLoading(true);
		try {
			const result = await gameHistoryService.loadGameHistory();
			setItems(result.historyItems);
			setError(result.error);
		} catch (e: any) {
			console.warn('load db error', e);
			setError(e?.message ?? String(e));
			setItems([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { load(); }, []);

	// 下拉刷新
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await load();
		setRefreshing(false);
	}, []);

	const renderItem = ({ item, index }: { item: any; index: number }) => (
		<LocalGameCard
			item={item}
			index={index}
			onPress={(selectedItem) => {
				const h = selectedItem.__history;
				if (h) {
					(nav as any).navigate('GameDetail', { game: h, isLocal: true });
				}
			}}
		/>
	);

	if (loading) return (
		<LinearGradient
			colors={[color.background, color.lightBackground]}
			style={styles.loadingContainer}
		>
			<View style={styles.loadingContent}>
				<MaterialCommunityIcons name="database-sync" size={48} color={color.info} />
				<Text style={styles.loadingText}>正在加载本地数据库...</Text>
				<Text style={styles.loadingSubText}>读取本地存储的游戏记录</Text>
			</View>
		</LinearGradient>
	);

	if (!gameHistoryService.hasLocalDb) {
		return (
			<LinearGradient
				colors={[color.background, color.lightBackground]}
				style={styles.emptyContainer}
			>
				<View style={styles.emptyIconContainer}>
					<MaterialCommunityIcons name="database-off" size={64} color={color.mutedText} />
				</View>
				<Text style={styles.emptyText}>本地数据库不可用</Text>
				<Text style={styles.emptySubText}>
					本地数据库在当前运行环境不可用。{'\n'}
					请确保在模拟器/设备上使用原生运行。
				</Text>
				<TouchableOpacity 
					style={styles.emptyAction}
					onPress={() => load()}
					activeOpacity={0.7}
				>
					<LinearGradient
						colors={[color.info, '#7FB3D9']}
						style={styles.emptyActionGradient}
					>
						<MaterialCommunityIcons name="refresh" size={20} color={color.lightText} />
						<Text style={styles.emptyActionText}>重试</Text>
					</LinearGradient>
				</TouchableOpacity>
			</LinearGradient>
		);
	}

	return (
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
						<Text style={DatabaseStyles.headerTitle}>本地数据库</Text>
					</View>
					<View style={DatabaseStyles.headerRight}>
						<TouchableOpacity
							style={DatabaseStyles.headerButton}
							onPress={onRefresh}
							activeOpacity={0.7}
						>
							<MaterialCommunityIcons name="refresh" size={20} color={color.lightText} />
						</TouchableOpacity>
						{error && (
							<TouchableOpacity
								style={[DatabaseStyles.headerButton, { marginLeft: Spacing.xs }]}
								onPress={() => Alert.alert('错误详情', error)}
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
						<Text style={DatabaseStyles.statChipText}>{items.length} 条记录</Text>
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
						refreshing={refreshing} 
						onRefresh={onRefresh}
						colors={[color.info]}
						tintColor={color.info}
					/>
				}
				showsVerticalScrollIndicator={false}
				ListEmptyComponent={
					<LinearGradient
						colors={['rgba(255, 255, 255, 0.8)', 'rgba(248, 250, 251, 0.8)']}
						style={styles.emptyContainer}
					>
						<View style={styles.emptyIconContainer}>
							<MaterialCommunityIcons name="database-search" size={64} color={color.mutedText} />
						</View>
						<Text style={styles.emptyText}>暂无本地记录</Text>
						<Text style={styles.emptySubText}>
							完成一局游戏后，可在此查看本地快照。{'\n'}
							本地记录独立于云端数据存储。
						</Text>
						{error && (
							<View style={DatabaseStyles.errorContainer}>
								<MaterialCommunityIcons name="alert-circle-outline" size={20} color={color.error} />
								<Text style={DatabaseStyles.errorText}>{error}</Text>
								<TouchableOpacity
									style={DatabaseStyles.errorButton}
									onPress={() => load()}
									activeOpacity={0.7}
								>
									<Text style={DatabaseStyles.errorButtonText}>重新加载</Text>
								</TouchableOpacity>
							</View>
						)}
					</LinearGradient>
				}
			/>
		</LinearGradient>
	);
}
