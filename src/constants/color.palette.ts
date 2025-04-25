import { PrimaryButton } from "@/components/PrimaryButton";

export const Palette = {
    background: '#FFFFF0',
    lightBackground: '#FFFFFF', // 浅色背景，适合大部分页面
    highLighter: '#F0845D',   
    card: '#FFEE70',       // 白色卡片背景，干净整洁
    borderColor: '#E0E0E0',       // 柔化黑色，用于标题/高对比文本
    
    primary:'#d46613', // 主要按钮颜色，鲜明且易于识别

    // 灰阶系统（用于背景、边框、辅助文本）
    lightGray: '#F7F7F7',   // 页面背景，柔和不刺眼
    mediumGray: '#E0E0E0',  // 分隔线、卡片边框
    darkGray: '#424242',    // 较重的中性灰，可用于高层叠信息块
    weakGray: '#BDBDBD',   // 轻度分隔线、辅助文本
    strongGray: '#757575',  // 深色文本、标题



    // 文本用灰
    title: '#333',         // 主要标题文本，深色
    text: '#666666',    // 主体灰色文本
    lightText:'#FFFFFF', // 浅色文本，适用于深色背景
    mutedText: '#999999',   // 次级信息，时间戳、提示等
    loadingText: '#7f8c8d', // 加载状态文本，深色
    valueText : '#2c3e50' , // 主要数值文本，深色
    valueLabel: '#7f8c8d', // 主要数值文本，深色
    // 阴影
    shadowLight: 'rgba(0, 0, 0, 0.06)', // 卡片等元素的微阴影
    shadowDark: 'rgba(0, 0, 0, 0.2)',   // 交互浮层、Modal 背景感

    // 状态色
    success: '#ACBD86',     // 成功提示绿，友好而醒目
    info: '#A4C8E1',        // 信息提示蓝，清新而不突兀
    confirm: '#ACBD86',    // 确认提示黄，温暖而不刺眼
    cancel: '#FFA06F',      // 取消提示黄，温暖而不刺眼
    error: '#F44336',       // 错误提示红，强对比
    warning: '#FFA000',     // 警告提示橙，温和但有强调

    // 覆盖层（如 Loading 背景、模态背景）
    overlayLight: 'rgba(255, 255, 255, 0.96)', // 基于浅色的遮罩层
    overlayDark: 'rgba(0, 0, 0, 0.12)',        // 用于浅色背景上的模态遮罩
};
